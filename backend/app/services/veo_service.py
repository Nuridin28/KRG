"""Google Veo video generation service — image-to-video using google-genai SDK."""

from __future__ import annotations

import asyncio
import base64
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

import httpx

from app.core.config import settings
from app.models.schemas import VideoJobResponse, VideoJobStatus

logger = logging.getLogger(__name__)

VIDEO_DIR = Path(settings.IMAGE_STORAGE_PATH) / "videos"
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

VEO_MODEL = "veo-3.1-generate-001"

MOTION_PROMPT = (
    "Person slowly and naturally turning to show the outfit from different angles, "
    "smooth gentle rotation, fashion lookbook video style, studio lighting, "
    "professional fashion photography, subtle movement"
)


class VeoService:
    def __init__(self) -> None:
        self._jobs: Dict[str, VideoJobResponse] = {}
        self._use_veo = bool(settings.VERTEX_AI_PROJECT)

        if self._use_veo:
            try:
                from google import genai
                self._client = genai.Client(
                    project=settings.VERTEX_AI_PROJECT,
                    location=settings.VERTEX_AI_LOCATION,
                    vertexai=True,
                )
                logger.info(f"Veo enabled via google-genai SDK (project={settings.VERTEX_AI_PROJECT})")
            except Exception as e:
                logger.warning(f"Could not init google-genai client: {e}")
                self._client = None
                self._use_veo = False
        else:
            self._client = None

    async def create_video_job(
        self,
        source_image_url: str,
        prompt: str = MOTION_PROMPT,
    ) -> VideoJobResponse:
        job_id = f"video-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        job = VideoJobResponse(
            job_id=job_id,
            status=VideoJobStatus.QUEUED,
            progress=0,
            created_at=now,
        )
        self._jobs[job_id] = job

        if self._use_veo and self._client:
            asyncio.create_task(
                self._process_veo(job_id, source_image_url, prompt)
            )
        else:
            job.status = VideoJobStatus.FAILED
            job.failure_reason = "Генерация видео недоступна (Veo не настроен)"
            job.completed_at = now

        return job

    async def _process_veo(
        self, job_id: str, source_image_url: str, prompt: str
    ) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = VideoJobStatus.PROCESSING
        job.progress = 5

        try:
            from google.genai import types

            # Step 1: Download source image (try-on result)
            job.progress = 10
            async with httpx.AsyncClient(timeout=30.0) as client:
                img_resp = await client.get(source_image_url)
                img_resp.raise_for_status()
                image_bytes = img_resp.content
            job.progress = 15

            # Step 2: Build image object for Veo
            # Detect mime type from bytes
            mime_type = "image/png"
            if image_bytes[:3] == b"\xff\xd8\xff":
                mime_type = "image/jpeg"
            elif image_bytes[:4] == b"RIFF":
                mime_type = "image/webp"

            image = types.Image(image_bytes=image_bytes, mime_type=mime_type)

            # Step 3: Create video generation source with image + prompt
            source = types.GenerateVideosSource(
                image=image,
                prompt=prompt,
            )

            config = types.GenerateVideosConfig(
                aspect_ratio="9:16",
                number_of_videos=1,
                duration_seconds=4,
                person_generation="allow_all",
                generate_audio=False,
                resolution="720p",
            )

            job.progress = 20

            # Step 4: Call Veo API (runs sync, so wrap in thread)
            def _generate():
                operation = self._client.models.generate_videos(
                    model=VEO_MODEL,
                    source=source,
                    config=config,
                )
                # Poll until done
                while not operation.done:
                    time.sleep(5)
                    operation = self._client.operations.get(operation)
                return operation

            operation = await asyncio.to_thread(_generate)
            job.progress = 90

            # Step 5: Extract result
            response = operation.result
            logger.info(f"Veo operation response: {response}")
            logger.info(f"Veo operation error: {operation.error if hasattr(operation, 'error') else 'N/A'}")

            if not response:
                # Try to get error details
                error_detail = ""
                if hasattr(operation, "error") and operation.error:
                    error_detail = str(operation.error)
                raise RuntimeError(f"Veo returned no result. {error_detail}")

            generated_videos = response.generated_videos
            if not generated_videos:
                raise RuntimeError(f"Veo generated no videos. Response: {response}")

            video = generated_videos[0].video
            if not video:
                raise RuntimeError("Veo video object is empty")

            logger.info(f"Veo video attrs: {dir(video)}")

            # Step 6: Save video to disk
            output_filename = f"{job_id}.mp4"
            output_path = VIDEO_DIR / output_filename

            # google-genai Video object — try different ways to get bytes
            if hasattr(video, "video_bytes") and video.video_bytes:
                output_path.write_bytes(video.video_bytes)
            elif hasattr(video, "data") and video.data:
                output_path.write_bytes(video.data)
            elif hasattr(video, "uri") and video.uri:
                # Download from GCS URI using authenticated request
                import google.auth
                import google.auth.transport.requests as gauth_requests
                creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
                creds.refresh(gauth_requests.Request())
                async with httpx.AsyncClient(timeout=60.0) as dl_client:
                    dl = await dl_client.get(
                        video.uri,
                        headers={"Authorization": f"Bearer {creds.token}"},
                    )
                    dl.raise_for_status()
                    output_path.write_bytes(dl.content)
            else:
                raise RuntimeError(f"Cannot extract video bytes. Video: {video}, attrs: {dir(video)}")

            job.progress = 100
            job.status = VideoJobStatus.COMPLETED
            base = settings.PUBLIC_BASE_URL.rstrip("/")
            job.video_url = f"{base}/storage/images/videos/{output_filename}"
            job.completed_at = datetime.now(timezone.utc)

            logger.info(f"Veo video job {job_id} completed")

        except Exception as e:
            logger.error(f"Veo video failed for job {job_id}: {e}")
            job.status = VideoJobStatus.FAILED
            job.failure_reason = str(e)
            job.completed_at = datetime.now(timezone.utc)

    async def _simulate_processing(
        self, job_id: str, source_image_url: str
    ) -> None:
        """Mock mode: simulate video generation."""
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = VideoJobStatus.PROCESSING
        job.progress = 10

        for pct in (20, 40, 60, 80, 95):
            await asyncio.sleep(1.0)
            job.progress = pct

        await asyncio.sleep(0.5)
        job.progress = 100
        job.status = VideoJobStatus.COMPLETED
        job.video_url = source_image_url
        job.completed_at = datetime.now(timezone.utc)

    async def get_job(self, job_id: str) -> Optional[VideoJobResponse]:
        return self._jobs.get(job_id)
