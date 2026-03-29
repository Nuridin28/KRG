"""SQLAlchemy ORM models."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(20), default="user")  # "user" | "admin"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Preferences (Feature 3: Style of the day)
    preferred_styles: Mapped[list | None] = mapped_column(JSON, nullable=True)
    preferred_gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    sku_id: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(255))
    brand: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    subcategory: Mapped[str] = mapped_column(String(50))
    gender: Mapped[str] = mapped_column(String(20), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(50))
    color_name: Mapped[str] = mapped_column(String(50))
    color_hex: Mapped[str] = mapped_column(String(10))
    pattern: Mapped[str] = mapped_column(String(50), default="solid")
    fit: Mapped[str] = mapped_column(String(50), default="regular")
    material: Mapped[str] = mapped_column(String(255), default="")
    price: Mapped[float] = mapped_column(Float)
    promo_price: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    sizes: Mapped[list] = mapped_column(JSON, default=list)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[str] = mapped_column(Text)
    style_tags: Mapped[list] = mapped_column(JSON, default=list)
    occasion_tags: Mapped[list] = mapped_column(JSON, default=list)
    season: Mapped[str] = mapped_column(String(50), default="all")
    seller_id: Mapped[str] = mapped_column(String(100), default="marketplace")
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class SavedOutfit(Base):
    __tablename__ = "saved_outfits"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    items_json: Mapped[list] = mapped_column(JSON, default=list)
    style: Mapped[str] = mapped_column(String(50), default="")
    occasion: Mapped[str] = mapped_column(String(50), default="")
    total_price: Mapped[float] = mapped_column(Float, default=0)
    compatibility_score: Mapped[float] = mapped_column(Float, default=0)
    explanation: Mapped[str] = mapped_column(Text, default="")
    badges: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    user_id: Mapped[str] = mapped_column(String(100), default="anonymous", index=True)
    product_id: Mapped[str] = mapped_column(String(50), nullable=True)
    outfit_id: Mapped[str] = mapped_column(String(50), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class UserPhoto(Base):
    """Saved user photos for one-click try-on."""
    __tablename__ = "user_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    image_path: Mapped[str] = mapped_column(String(500))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class WardrobeItem(Base):
    """User's personal wardrobe for capsule analysis."""
    __tablename__ = "wardrobe_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    product_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255), default="")
    color_name: Mapped[str] = mapped_column(String(50), default="")
    color_hex: Mapped[str] = mapped_column(String(10), default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    style_tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DailyOutfit(Base):
    """Pre-generated daily outfit recommendation per user."""
    __tablename__ = "daily_outfits"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    outfit_json: Mapped[dict] = mapped_column(JSON)
    weather_summary: Mapped[str] = mapped_column(String(200), default="")
    temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
