"""Video generation endpoints (Google Veo image-to-video)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import absolute_public_url
from app.models.schemas import VideoJobResponse
from app.services.veo_service import VeoService

router = APIRouter(prefix="/video", tags=["Video Generation"])

veo_service = VeoService()


class VideoGenerateRequest(BaseModel):
    source_image_url: str
    prompt: str | None = None


@router.post("/generate", response_model=VideoJobResponse)
async def generate_video(req: VideoGenerateRequest) -> VideoJobResponse:
    """Generate a motion video from a try-on result image using Google Veo."""
    if not req.source_image_url:
        raise HTTPException(400, "source_image_url is required")

    kwargs = {}
    if req.prompt:
        kwargs["prompt"] = req.prompt

    job = await veo_service.create_video_job(
        source_image_url=absolute_public_url(req.source_image_url),
        **kwargs,
    )
    return job


@router.get("/jobs/{job_id}", response_model=VideoJobResponse)
async def get_video_job(job_id: str) -> VideoJobResponse:
    job = await veo_service.get_job(job_id)
    if not job:
        raise HTTPException(404, "Video job not found")
    return job
