"""Embedding service -- generates and searches product embeddings via OpenAI."""

from __future__ import annotations

import logging
from typing import List, Optional

import numpy as np
import openai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.db_models import Product as ProductDB

logger = logging.getLogger(__name__)

EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM = 1536


def _product_text(p: ProductDB) -> str:
    """Build a rich text representation of a product for embedding."""
    parts = [
        p.name,
        f"Бренд: {p.brand}" if p.brand else "",
        f"Категория: {p.category}" if p.category else "",
        f"Подкатегория: {p.subcategory}" if p.subcategory else "",
        f"Цвет: {p.color_name}" if p.color_name else "",
        f"Материал: {p.material}" if p.material else "",
        f"Стиль: {', '.join(p.style_tags)}" if p.style_tags else "",
        f"Повод: {', '.join(p.occasion_tags)}" if p.occasion_tags else "",
        f"Пол: {p.gender}" if p.gender else "",
        f"Сезон: {p.season}" if p.season and p.season != "all" else "",
        p.description or "",
    ]
    return " | ".join(part for part in parts if part)


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    dot = np.dot(va, vb)
    norm = np.linalg.norm(va) * np.linalg.norm(vb)
    if norm == 0:
        return 0.0
    return float(dot / norm)


class EmbeddingService:
    def __init__(self) -> None:
        self._client: Optional[openai.OpenAI] = None
        if settings.OPENAI_API_KEY:
            self._client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self._client:
            return []
        resp = self._client.embeddings.create(model=EMBED_MODEL, input=texts)
        return [item.embedding for item in resp.data]

    def embed_query(self, query: str) -> Optional[List[float]]:
        results = self._embed_texts([query])
        return results[0] if results else None

    async def embed_all_products(self, db: AsyncSession) -> int:
        """Generate embeddings for all products that don't have one yet."""
        result = await db.execute(
            select(ProductDB).where(ProductDB.embedding.is_(None))
        )
        products = result.scalars().all()
        if not products:
            return 0

        # Batch embed (max 2048 per request)
        batch_size = 100
        total = 0
        for i in range(0, len(products), batch_size):
            batch = products[i : i + batch_size]
            texts = [_product_text(p) for p in batch]
            embeddings = self._embed_texts(texts)
            if not embeddings:
                break
            for product, emb in zip(batch, embeddings):
                product.embedding = emb
            total += len(batch)

        await db.commit()
        logger.info(f"Embedded {total} products")
        return total

    async def search_products(
        self,
        db: AsyncSession,
        query: str,
        top_k: int = 10,
        category: Optional[str] = None,
        gender: Optional[str] = None,
    ) -> List[tuple[ProductDB, float]]:
        """Search products by semantic similarity to query."""
        query_emb = self.embed_query(query)
        if not query_emb:
            return []

        stmt = select(ProductDB).where(
            ProductDB.embedding.isnot(None),
            ProductDB.in_stock == True,
        )
        if category:
            stmt = stmt.where(ProductDB.category == category)
        if gender:
            from sqlalchemy import or_
            stmt = stmt.where(or_(ProductDB.gender == gender, ProductDB.gender == "unisex"))

        result = await db.execute(stmt)
        products = result.scalars().all()

        scored = []
        for p in products:
            sim = _cosine_similarity(query_emb, p.embedding)
            scored.append((p, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]
