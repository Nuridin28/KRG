"""Seed script: creates tables, loads catalog.json into PostgreSQL, creates admin user."""

import asyncio
import json
from pathlib import Path

from app.core.config import settings
from app.core.database import Base, engine, async_session
from app.core.security import hash_password
from app.models.db_models import Product, User


async def seed():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Seed products from catalog.json
        existing = (await db.execute(__import__("sqlalchemy").select(Product.id))).scalars().all()
        if existing:
            print(f"Products already seeded ({len(existing)} rows). Skipping products.")
        else:
            catalog_path = Path(__file__).parent / "data" / "catalog.json"
            with open(catalog_path, encoding="utf-8") as fh:
                raw = json.load(fh)

            for item in raw:
                product = Product(
                    id=item["id"],
                    sku_id=item["sku_id"],
                    name=item["name"],
                    brand=item["brand"],
                    category=item["category"],
                    subcategory=item["subcategory"],
                    gender=item["gender"],
                    description=item.get("description", ""),
                    color=item.get("color", ""),
                    color_name=item.get("color_name", ""),
                    color_hex=item.get("color_hex", ""),
                    pattern=item.get("pattern", "solid"),
                    fit=item.get("fit", "regular"),
                    material=item.get("material", ""),
                    price=item["price"],
                    promo_price=item.get("promo_price"),
                    currency=item.get("currency", "USD"),
                    sizes=item.get("sizes", []),
                    in_stock=item.get("in_stock", True),
                    image_url=item.get("image_url", ""),
                    style_tags=item.get("style_tags", []),
                    occasion_tags=item.get("occasion_tags", []),
                    season=item.get("season", "all"),
                    seller_id=item.get("seller_id", "marketplace"),
                )
                db.add(product)

            await db.commit()
            print(f"Seeded {len(raw)} products.")

        # Create admin user if not exists
        from sqlalchemy import select as sa_select
        admin_result = await db.execute(sa_select(User).where(User.email == "admin@krg.com"))
        if not admin_result.scalar_one_or_none():
            admin = User(
                email="admin@krg.com",
                hashed_password=hash_password("admin123"),
                full_name="Admin",
                role="admin",
            )
            db.add(admin)
            await db.commit()
            print("Created admin user: admin@krg.com / admin123")
        else:
            print("Admin user already exists.")

    await engine.dispose()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(seed())
