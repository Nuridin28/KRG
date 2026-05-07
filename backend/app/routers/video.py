"""Video generation endpoints (Google Veo image-to-video)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.http_url import absolute_http_url
from app.models.schemas import VideoJobResponse
from app.services.veo_service import VeoService

router = APIRouter(prefix="/video", tags=["Video Generation"])

veo_service = VeoService()


class VideoGenerateRequest(BaseModel):
    source_image_url: str = Field(
        ...,
        description="URL исходного изображения (обычно — результат try-on). Поддерживаются абсолютные URL и пути `/storage/...`.",
        examples=["/storage/images/tryon/abc123.png"],
    )
    prompt: str | None = Field(
        None,
        description="Текстовый prompt с описанием движения (по умолчанию — лёгкий поворот / дыхание модели).",
        examples=["модель поворачивается на 360°, лёгкий ветер в волосах"],
    )


@router.post(
    "/generate",
    response_model=VideoJobResponse,
    summary="Сгенерировать motion-видео",
    description=(
        "Создаёт асинхронную задачу image-to-video (Google Veo). "
        "На вход — изображение результата примерки, на выход — короткий MP4-ролик с лёгким движением "
        "модели. Опрос статуса — через `GET /video/jobs/{job_id}`."
    ),
    response_description="Описание созданной задачи генерации видео",
    responses={
        200: {"description": "Задача создана"},
        400: {"description": "Не передан `source_image_url`"},
    },
)
async def generate_video(req: VideoGenerateRequest) -> VideoJobResponse:
    if not req.source_image_url:
        raise HTTPException(400, "source_image_url is required")

    kwargs = {}
    if req.prompt:
        kwargs["prompt"] = req.prompt

    job = await veo_service.create_video_job(
        source_image_url=absolute_http_url(req.source_image_url),
        **kwargs,
    )
    return job


@router.get(
    "/jobs/{job_id}",
    response_model=VideoJobResponse,
    summary="Статус задачи генерации видео",
    description=(
        "Возвращает текущее состояние задачи Veo. "
        "Возможные значения `status`: `pending`, `processing`, `succeeded`, `failed`. "
        "При `succeeded` поле `result_video_url` содержит URL готового MP4."
    ),
    response_description="Текущее состояние задачи",
    responses={
        200: {"description": "Состояние получено"},
        404: {"description": "Задача не найдена"},
    },
)
async def get_video_job(job_id: str) -> VideoJobResponse:
    job = await veo_service.get_job(job_id)
    if not job:
        raise HTTPException(404, "Video job not found")
    return job
