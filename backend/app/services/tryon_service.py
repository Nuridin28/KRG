"""Virtual try-on service -- Vertex AI VTO with mock fallback."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

import httpx

from app.core.config import settings
from app.models.schemas import TryOnJobResponse, TryOnJobStatus

logger = logging.getLogger(__name__)

VERTEX_VTO_URL = (
    f"https://{settings.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/"
    f"projects/{settings.VERTEX_AI_PROJECT}/locations/{settings.VERTEX_AI_LOCATION}/"
    f"publishers/google/models/virtual-try-on-001:predict"
)

IMAGE_DIR = Path(settings.IMAGE_STORAGE_PATH).resolve()
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# Store jobs file outside the watched directory to prevent uvicorn --reload loops
_JOBS_DIR = Path("/tmp/krg_tryon")
_JOBS_DIR.mkdir(parents=True, exist_ok=True)
JOBS_FILE = _JOBS_DIR / "_jobs.json"

# get_job() marks QUEUED/PROCESSING as failed if older than this (orphaned work).
_STALE_JOB_MAX_AGE_SEC = 30  # If job hasn't progressed in 30s, it's likely orphaned


def _get_gcp_access_token() -> Optional[str]:
    """Get GCP access token via Application Default Credentials."""
    try:
        import google.auth
        import google.auth.transport.requests

        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(google.auth.transport.requests.Request())
        return credentials.token
    except Exception as e:
        logger.warning(f"Could not get GCP credentials: {e}")
        return None


class TryOnService:
    def __init__(self) -> None:
        self._jobs: Dict[str, TryOnJobResponse] = {}
        self._active_tasks: set[str] = set()  # job IDs with running asyncio tasks
        self._user_counts: Dict[str, int] = {}
        self._rate_limit = 20
        self._use_vertex = bool(settings.VERTEX_AI_PROJECT)

        self._load_jobs()

        if self._use_vertex:
            logger.info(f"Vertex AI VTO enabled for project: {settings.VERTEX_AI_PROJECT}")
        else:
            logger.info("Vertex AI VTO not configured or no credentials, using mock mode")

    def _save_jobs(self) -> None:
        """Persist all jobs to disk so they survive restarts."""
        try:
            data = {jid: job.model_dump(mode="json") for jid, job in self._jobs.items()}
            JOBS_FILE.write_text(json.dumps(data, default=str))
        except Exception as e:
            logger.warning(f"Failed to save jobs: {e}")

    def _load_jobs(self) -> None:
        """Load persisted jobs from disk on startup. Mark incomplete jobs as failed."""
        if not JOBS_FILE.exists():
            return
        try:
            data = json.loads(JOBS_FILE.read_text())
            for jid, raw in data.items():
                job = TryOnJobResponse(**raw)
                if job.status in (TryOnJobStatus.QUEUED, TryOnJobStatus.PROCESSING):
                    job.status = TryOnJobStatus.FAILED
                    job.failure_reason = "Сервер был перезапущен. Попробуйте снова."
                    job.completed_at = datetime.now(timezone.utc)
                self._jobs[jid] = job
            logger.info(f"Loaded {len(data)} persisted try-on jobs")
        except Exception as e:
            logger.warning(f"Failed to load jobs: {e}")

    async def create_job(
        self,
        person_image_bytes: bytes,
        product_id: str,
        product_image_url: str,
        user_id: str = "anonymous",
    ) -> TryOnJobResponse:
        count = self._user_counts.get(user_id, 0)
        if count >= self._rate_limit:
            raise ValueError("Rate limit exceeded. Try again later.")

        if len(person_image_bytes) < 1000:
            raise ValueError("Image too small. Please upload a higher quality photo.")

        job_id = f"tryon-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        provider = "vertex-ai-vto" if self._use_vertex else "vertex-ai-vto-dev"

        job = TryOnJobResponse(
            job_id=job_id,
            status=TryOnJobStatus.QUEUED,
            progress=0,
            provider_used=provider,
            created_at=now,
        )
        self._jobs[job_id] = job
        self._active_tasks.add(job_id)
        self._user_counts[user_id] = count + 1
        self._save_jobs()

        if self._use_vertex:
            asyncio.create_task(
                self._process_vertex(job_id, person_image_bytes, product_image_url)
            )
        else:
            asyncio.create_task(
                self._simulate_processing(job_id, product_image_url)
            )

        return job

    # ------------------------------------------------------------------
    # Real Vertex AI VTO processing
    # ------------------------------------------------------------------

    async def _process_vertex(
        self, job_id: str, person_image_bytes: bytes, product_image_url: str
    ) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = TryOnJobStatus.PROCESSING
        job.progress = 10

        try:
            # Step 1: Get access token
            token = await asyncio.to_thread(_get_gcp_access_token)
            if not token:
                raise RuntimeError("Failed to obtain GCP access token")
            job.progress = 20

            # Step 2: Download garment image
            async with httpx.AsyncClient(timeout=30.0) as client:
                garment_resp = await client.get(product_image_url)
                garment_resp.raise_for_status()
                garment_bytes = garment_resp.content
            job.progress = 35

            # Step 3: Encode images to base64
            person_b64 = base64.b64encode(person_image_bytes).decode("utf-8")
            garment_b64 = base64.b64encode(garment_bytes).decode("utf-8")
            job.progress = 40

            # Step 4: Call Vertex AI VTO API
            payload = {
                "instances": [
                    {
                        "personImage": {
                            "image": {"bytesBase64Encoded": person_b64}
                        },
                        "productImages": [
                            {
                                "image": {"bytesBase64Encoded": garment_b64}
                            }
                        ],
                    }
                ],
                "parameters": {
                    "sampleCount": 1,
                    "baseSteps": 32,
                    "personGeneration": "allow_all",
                },
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    VERTEX_VTO_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )
                job.progress = 80

                if resp.status_code != 200:
                    error_detail = resp.text[:500]
                    raise RuntimeError(f"Vertex AI returned {resp.status_code}: {error_detail}")

                result = resp.json()

            # Step 5: Save output image
            predictions = result.get("predictions", [])
            if not predictions:
                raise RuntimeError("No predictions in Vertex AI response")

            output_b64 = predictions[0].get("bytesBase64Encoded", "")
            if not output_b64:
                raise RuntimeError("Empty prediction from Vertex AI")

            output_bytes = base64.b64decode(output_b64)
            output_filename = f"{job_id}.png"
            output_path = IMAGE_DIR / output_filename
            output_path.write_bytes(output_bytes)

            job.progress = 100
            job.status = TryOnJobStatus.COMPLETED
            base = settings.PUBLIC_BASE_URL.rstrip("/")
            job.output_image_url = f"{base}/storage/images/{output_filename}"
            job.completed_at = datetime.now(timezone.utc)

            logger.info(f"Try-on job {job_id} completed via Vertex AI VTO")
            self._active_tasks.discard(job_id)
            self._save_jobs()

        except Exception as e:
            logger.error(f"Vertex AI VTO failed for job {job_id}: {e}")
            job.status = TryOnJobStatus.FAILED
            job.failure_reason = str(e)
            job.completed_at = datetime.now(timezone.utc)
            self._active_tasks.discard(job_id)
            self._save_jobs()

    # ------------------------------------------------------------------
    # Mock fallback (dev mode)
    # ------------------------------------------------------------------

    async def _simulate_processing(self, job_id: str, product_image_url: str) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = TryOnJobStatus.PROCESSING
        job.progress = 10

        for pct in (30, 50, 70, 90):
            await asyncio.sleep(0.6)
            job.progress = pct

        await asyncio.sleep(0.5)
        job.status = TryOnJobStatus.COMPLETED
        job.progress = 100
        job.output_image_url = product_image_url
        job.completed_at = datetime.now(timezone.utc)
        self._active_tasks.discard(job_id)
        self._save_jobs()

    # ------------------------------------------------------------------
    # Chained outfit try-on
    # ------------------------------------------------------------------

    async def create_outfit_job(
        self,
        person_image_bytes: bytes,
        product_items: list[dict],
        user_id: str = "anonymous",
    ) -> TryOnJobResponse:
        """Create a single job that chains VTO across multiple garments."""
        count = self._user_counts.get(user_id, 0)
        if count >= self._rate_limit:
            raise ValueError("Rate limit exceeded. Try again later.")

        if len(person_image_bytes) < 1000:
            raise ValueError("Image too small. Please upload a higher quality photo.")

        job_id = f"tryon-outfit-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        provider = "vertex-ai-vto" if self._use_vertex else "vertex-ai-vto-dev"

        job = TryOnJobResponse(
            job_id=job_id,
            status=TryOnJobStatus.QUEUED,
            progress=0,
            provider_used=provider,
            created_at=now,
            total_items=len(product_items),
            completed_items=0,
        )
        self._jobs[job_id] = job
        self._active_tasks.add(job_id)
        self._user_counts[user_id] = count + 1
        self._save_jobs()

        if self._use_vertex:
            asyncio.create_task(
                self._process_outfit_chain(job_id, person_image_bytes, product_items)
            )
        else:
            asyncio.create_task(
                self._simulate_outfit_chain(job_id, product_items)
            )

        return job

    async def _process_outfit_chain(
        self,
        job_id: str,
        person_image_bytes: bytes,
        product_items: list[dict],
    ) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = TryOnJobStatus.PROCESSING
        job.progress = 0
        total = len(product_items)

        try:
            # Get GCP token once for the entire chain
            token = await asyncio.to_thread(_get_gcp_access_token)
            if not token:
                raise RuntimeError("Failed to obtain GCP access token")

            current_person_bytes = person_image_bytes

            for idx, item in enumerate(product_items):
                step_num = idx + 1
                product_name = item.get("product_name", f"Item {step_num}")
                job.current_step = f"Примеряем: {product_name} ({step_num}/{total})"
                job.completed_items = idx

                base_progress = int((idx / total) * 100)
                step_size = int(100 / total)

                # Download garment image
                job.progress = base_progress + int(step_size * 0.1)
                async with httpx.AsyncClient(timeout=30.0) as client:
                    garment_resp = await client.get(item["product_image_url"])
                    garment_resp.raise_for_status()
                    garment_bytes = garment_resp.content

                job.progress = base_progress + int(step_size * 0.3)

                # Encode images
                person_b64 = base64.b64encode(current_person_bytes).decode("utf-8")
                garment_b64 = base64.b64encode(garment_bytes).decode("utf-8")

                # Call Vertex AI VTO
                payload = {
                    "instances": [
                        {
                            "personImage": {
                                "image": {"bytesBase64Encoded": person_b64}
                            },
                            "productImages": [
                                {
                                    "image": {"bytesBase64Encoded": garment_b64}
                                }
                            ],
                        }
                    ],
                    "parameters": {
                        "sampleCount": 1,
                        "baseSteps": 32,
                        "personGeneration": "allow_all",
                    },
                }

                job.progress = base_progress + int(step_size * 0.4)

                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(
                        VERTEX_VTO_URL,
                        json=payload,
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json",
                        },
                    )

                job.progress = base_progress + int(step_size * 0.8)

                if resp.status_code != 200:
                    error_detail = resp.text[:500]
                    raise RuntimeError(f"Vertex AI returned {resp.status_code}: {error_detail}")

                result = resp.json()
                predictions = result.get("predictions", [])
                if not predictions:
                    raise RuntimeError(f"No predictions for step {step_num}")

                output_b64 = predictions[0].get("bytesBase64Encoded", "")
                if not output_b64:
                    raise RuntimeError(f"Empty prediction for step {step_num}")

                # Use output as the person image for the next iteration
                current_person_bytes = base64.b64decode(output_b64)
                job.progress = base_progress + step_size

            # Save the final image
            output_filename = f"{job_id}.png"
            output_path = IMAGE_DIR / output_filename
            output_path.write_bytes(current_person_bytes)

            job.progress = 100
            job.completed_items = total
            job.current_step = None
            job.status = TryOnJobStatus.COMPLETED
            base = settings.PUBLIC_BASE_URL.rstrip("/")
            job.output_image_url = f"{base}/storage/images/{output_filename}"
            job.completed_at = datetime.now(timezone.utc)

            logger.info(f"Outfit try-on job {job_id} completed via Vertex AI VTO ({total} items)")
            self._active_tasks.discard(job_id)
            self._save_jobs()

        except Exception as e:
            logger.error(f"Outfit try-on failed for job {job_id}: {e}")
            job.status = TryOnJobStatus.FAILED
            job.failure_reason = str(e)
            job.completed_at = datetime.now(timezone.utc)
            self._active_tasks.discard(job_id)
            self._save_jobs()

    async def _simulate_outfit_chain(
        self,
        job_id: str,
        product_items: list[dict],
    ) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = TryOnJobStatus.PROCESSING
        job.progress = 0
        total = len(product_items)

        for idx, item in enumerate(product_items):
            step_num = idx + 1
            product_name = item.get("product_name", f"Item {step_num}")
            job.current_step = f"Примеряем: {product_name} ({step_num}/{total})"
            job.completed_items = idx

            base_progress = int((idx / total) * 100)
            step_size = int(100 / total)

            for fraction in (0.3, 0.6, 0.9):
                await asyncio.sleep(0.5)
                job.progress = base_progress + int(step_size * fraction)

            job.progress = base_progress + step_size

        # Use the last product's image_url as mock output
        last_image_url = product_items[-1].get("product_image_url", "")
        job.progress = 100
        job.completed_items = total
        job.current_step = None
        job.status = TryOnJobStatus.COMPLETED
        job.output_image_url = last_image_url
        job.completed_at = datetime.now(timezone.utc)
        self._active_tasks.discard(job_id)
        self._save_jobs()

    async def get_job(self, job_id: str) -> Optional[TryOnJobResponse]:
        job = self._jobs.get(job_id)
        # Fallback: check persisted file (job may have been saved by a previous process)
        if not job and JOBS_FILE.exists():
            try:
                data = json.loads(JOBS_FILE.read_text())
                if job_id in data:
                    job = TryOnJobResponse(**data[job_id])
                    self._jobs[job_id] = job
            except Exception:
                pass
        if not job:
            return None
        # If job is queued/processing but NOT being handled by this process, it's orphaned
        if job.status in (TryOnJobStatus.QUEUED, TryOnJobStatus.PROCESSING):
            if job_id not in self._active_tasks:
                job.status = TryOnJobStatus.FAILED
                job.failure_reason = "Сервер был перезапущен. Попробуйте снова."
                job.completed_at = datetime.now(timezone.utc)
                self._save_jobs()
        return job
