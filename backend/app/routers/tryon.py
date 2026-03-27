"""Virtual try-on endpoints."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import TryOnJobResponse
from app.services.catalog_service import CatalogService
from app.services.tryon_service import TryOnService

router = APIRouter(prefix="/tryon", tags=["Virtual Try-On"])

tryon_service = TryOnService()
catalog_service = CatalogService()


@router.post("/jobs", response_model=TryOnJobResponse)
async def create_tryon_job(
    person_image: UploadFile = File(...),
    product_id: str = Form(...),
) -> TryOnJobResponse:
    product = catalog_service.get_product(product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    person_bytes = await person_image.read()
    if not person_bytes:
        raise HTTPException(400, "Empty image file")

    job = await tryon_service.create_job(
        person_image_bytes=person_bytes,
        product_id=product_id,
        product_image_url=product.image_url,
    )
    return job


@router.get("/jobs/{job_id}", response_model=TryOnJobResponse)
async def get_tryon_job(job_id: str) -> TryOnJobResponse:
    job = await tryon_service.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
