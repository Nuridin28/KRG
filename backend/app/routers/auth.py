"""Authentication endpoints — register, login, me."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.models.db_models import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя",
    description=(
        "Создаёт нового пользователя с ролью `user`. "
        "Пароль хешируется (bcrypt) перед сохранением. "
        "После регистрации необходимо отдельно вызвать `/auth/login` для получения токена."
    ),
    response_description="Созданный пользователь (без пароля)",
    responses={
        201: {"description": "Пользователь создан"},
        400: {"description": "Email уже зарегистрирован"},
        422: {"description": "Невалидные поля (email/password/full_name)"},
    },
)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Вход (получение JWT-токена)",
    description=(
        "Проверяет email/пароль и возвращает JWT access-token. "
        "Срок жизни токена задаётся переменной `ACCESS_TOKEN_EXPIRE_MINUTES` (по умолчанию 60 минут).\n\n"
        "Использование: добавьте заголовок `Authorization: Bearer <access_token>` "
        "к запросам к защищённым эндпоинтам."
    ),
    response_description="Bearer-токен для авторизации",
    responses={
        200: {"description": "Успешная авторизация"},
        401: {"description": "Неверный email или пароль"},
        403: {"description": "Аккаунт деактивирован"},
    },
)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Текущий пользователь",
    description="Возвращает профиль владельца переданного JWT-токена. Требует авторизации.",
    response_description="Профиль текущего пользователя",
    responses={
        200: {"description": "Профиль получен"},
        401: {"description": "Не передан/невалидный/просроченный токен"},
    },
)
async def me(user: User = Depends(get_current_user)):
    return user
