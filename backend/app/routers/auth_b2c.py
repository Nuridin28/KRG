"""Passwordless email-code auth for the B2C try-on app."""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.models.auth_schemas import TokenResponse
from app.models.db_models import EmailVerificationCode, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/b2c", tags=["B2C Auth"])

CODE_TTL_MINUTES = 10
CODE_LENGTH = 6
DAILY_QUOTA = 5


class RequestCodeBody(BaseModel):
    email: EmailStr


class VerifyCodeBody(BaseModel):
    email: EmailStr
    code: str = Field(min_length=CODE_LENGTH, max_length=CODE_LENGTH)


class RequestCodeResponse(BaseModel):
    sent: bool
    expires_in_minutes: int = CODE_TTL_MINUTES
    # Dev only: returned when DEBUG is on so you can verify without SMTP.
    dev_code: str | None = None


class QuotaResponse(BaseModel):
    email: str
    daily_quota: int = DAILY_QUOTA
    used_today: int
    remaining: int


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


async def _send_email_code(email: str, code: str) -> None:
    # TODO: wire SMTP / Resend / SendGrid in production.
    # For now we log and rely on dev_code in the response when DEBUG=true.
    logger.info("[B2C OTP] code for %s = %s (valid %d min)", email, code, CODE_TTL_MINUTES)


@router.post(
    "/request-code",
    response_model=RequestCodeResponse,
    summary="Запросить код подтверждения",
    description=(
        "Генерирует 6-значный код и (в продакшене) отправляет его на email. "
        "В dev-режиме код возвращается в поле `dev_code` для удобства тестирования."
    ),
)
async def request_code(
    body: RequestCodeBody,
    db: AsyncSession = Depends(get_db),
) -> RequestCodeResponse:
    from app.core.config import settings

    email = body.email.lower().strip()
    code = "".join(secrets.choice("0123456789") for _ in range(CODE_LENGTH))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)

    # Invalidate older non-consumed codes for this email.
    await db.execute(
        update(EmailVerificationCode)
        .where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.consumed.is_(False),
        )
        .values(consumed=True)
    )
    db.add(
        EmailVerificationCode(
            email=email,
            code_hash=_hash_code(code),
            expires_at=expires_at,
        )
    )
    await db.commit()

    await _send_email_code(email, code)

    return RequestCodeResponse(
        sent=True,
        dev_code=code if settings.DEBUG else None,
    )


@router.post(
    "/verify-code",
    response_model=TokenResponse,
    summary="Проверить код и получить JWT",
    description=(
        "Сверяет email и код, помечает код использованным и возвращает токен. "
        "Если пользователя ещё нет — он создаётся автоматически."
    ),
)
async def verify_code(
    body: VerifyCodeBody,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    email = body.email.lower().strip()
    code = body.code.strip()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(EmailVerificationCode)
        .where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.consumed.is_(False),
            EmailVerificationCode.expires_at > now,
        )
        .order_by(EmailVerificationCode.id.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record or record.code_hash != _hash_code(code):
        raise HTTPException(400, "Неверный или просроченный код")

    record.consumed = True

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(24)),
            full_name=email.split("@")[0],
            role="user",
            tryon_count_today=0,
            tryon_count_date="",
        )
        db.add(user)
        await db.flush()

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)


@router.get(
    "/quota",
    response_model=QuotaResponse,
    summary="Сколько примерок осталось сегодня",
)
async def get_quota(user: User = Depends(get_current_user)) -> QuotaResponse:
    today = datetime.now(timezone.utc).date().isoformat()
    used = user.tryon_count_today if user.tryon_count_date == today else 0
    return QuotaResponse(
        email=user.email,
        used_today=used,
        remaining=max(0, DAILY_QUOTA - used),
    )
