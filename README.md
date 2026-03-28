# AI Stylist & Virtual Try-On

Fashion-маркетплейс с AI-стилистом, виртуальной примеркой и conversational-ассистентом.

Архитектурный принцип: **никаких собственных ML-моделей** — решение построено как оркестрация внешних managed AI-сервисов (Mapp Fashion, Vertex AI, OpenAI).

---

## Текущий стек

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Radix UI, Zustand, Lucide Icons |
| Backend | Python 3, FastAPI, Pydantic v2, uvicorn |
| AI-провайдеры (planned) | Mapp Fashion API, Google Vertex AI Virtual Try-On, OpenAI API |

---

## Что сейчас работает

### Backend — 23 эндпоинта (`http://localhost:8000`)

Swagger-документация: `http://localhost:8000/docs`

#### Каталог (`/api/v1/catalog`)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/catalog` | Список товаров с фильтрами (category, gender, style, occasion, brand, color, price_min/max, search, пагинация) |
| GET | `/catalog/{product_id}` | Карточка товара |
| GET | `/catalog/brands` | Список брендов |
| GET | `/catalog/colors` | Список цветов |
| GET | `/catalog/styles` | Список стилей |
| GET | `/catalog/occasions` | Список поводов |

- 48 товаров в mock-каталоге (12 tops, 10 bottoms, 4 dresses, 5 outerwear, 9 shoes, 8 accessories)
- Бренды: Zara, H&M, Mango, COS, Nike, Adidas, Uniqlo, New Balance и др.
- Фильтрация по всем полям, пагинация, полнотекстовый поиск

#### AI Стилист — генерация образов (`/api/v1/outfits`)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/outfits/generate` | Генерация образов по параметрам (стиль, повод, пол, бюджет, цвета, исключения) |
| POST | `/outfits/by-product` | Complete the Look — образы на основе конкретного товара |
| POST | `/outfits/recommend/{product_id}` | Похожие/дополняющие товары |

Что работает в dev-режиме (без внешних API):
- Автоматическая сборка образов из каталога по правилам category composition (top+bottom+shoes или dress+shoes+accessory)
- Color theory — оценка цветовой совместимости через HSL (нейтральные цвета, комплементарные, триадные сочетания)
- Style coherence scoring — оценка стилевой связности комплекта
- Business rules: фильтрация по наличию, бюджету, occasion-exclusions (нет шорт для офиса и т.д.)
- Compatibility score (0-100%) для каждого образа
- Badges: "Отличное сочетание", "Всё в наличии", "Бюджетный вариант"
- Explanation — текстовое объяснение рекомендации

#### Виртуальная примерка (`/api/v1/tryon`)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/tryon/jobs` | Создать задачу примерки (загрузка фото + product_id) |
| GET | `/tryon/jobs/{job_id}` | Статус задачи (progress 0-100%, queued/processing/completed/failed) |

Что работает в dev-режиме:
- Async job flow с прогрессом (имитация 3 сек обработки)
- Валидация изображения (размер, формат)
- Rate limiting по user_id
- Статусы: queued → processing → completed/failed

#### Conversational Stylist (`/api/v1/stylist`)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/stylist/chat` | Чат с AI-стилистом |
| GET | `/stylist/suggestions` | Готовые подсказки для начала диалога |

Что работает в dev-режиме:
- Парсинг intent из текста (keyword matching): повод, бюджет, цвета, пол
- Извлечение constraints из естественного языка (рус/англ): "образ на свидание до $200 в чёрном"
- Генерация образов через RecommendationService на основе extracted constraints
- Structured response: ответ + extracted_filters + товары + образы + CTA actions

#### Admin / Backoffice (`/api/v1/admin`)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET/POST | `/admin/rules` | CRUD бизнес-правил |
| PUT/DELETE | `/admin/rules/{rule_id}` | Обновление/удаление правила |
| GET | `/admin/stats` | Дашборд статистики |
| GET | `/admin/providers` | Статус AI-провайдеров (health, latency) |
| GET/POST | `/admin/feature-flags` | Feature flags |

#### Аналитика (`/api/v1/tracking`)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/tracking/events` | Batch-отправка событий |
| GET | `/tracking/events` | Получение событий (фильтр по типу, user_id) |

---

### Frontend — 4 страницы (`http://localhost:5173`)

#### 1. Каталог
- Сетка карточек товаров с цветовым превью
- Панель фильтров: категория, стиль, пол, бренд, диапазон цен, поиск
- Детальная карточка товара (диалог): цена, размеры, материал, стиль-теги
- Рекомендации "Похожие товары" в карточке
- CTA: "Собрать образ" и "Примерить" на каждом товаре

#### 2. AI Стилист
- Форма: стиль, повод, пол, бюджет (мин/макс)
- Генерация 1-3 образов с анимацией прогресса
- Карточка образа: состав, цены, compatibility score, badges, explanation
- "Купить всё" и "Примерить" на каждом образе
- Hover: замена вещи, примерка отдельного предмета

#### 3. Виртуальная примерка
- Drag-n-drop загрузка фото (JPEG/PNG/WebP до 10 МБ)
- Валидация формата и размера
- Progress bar обработки с polling статуса
- Сравнение До/После (side-by-side)
- CTA: "Добавить в корзину", "Собрать образ"

#### 4. AI Чат
- Чат-интерфейс с аватарами (user/bot)
- Быстрые подсказки: "Подбери образ на свидание", "Casual лук до $200" и др.
- Карточки товаров и мини-образы прямо в ответах ассистента
- Typing indicator (анимация точек)

---

## Что нужно сделать

### Интеграция внешних AI-сервисов

#### 1. Mapp Fashion API (рекомендации)
- **Зачем:** Сейчас образы собираются по внутренним правилам (category composition + color theory). Mapp Fashion предоставляет production-grade outfit recommendations, personalized suggestions и related products на основе ML.
- **Что нужно:**
  - Контракт с Mapp, получение API-ключей
  - Product data feed export в формат Mapp
  - Tracking implementation (view, click, purchase events)
  - Интеграция в `RecommendationService` — вызов Mapp API вместо внутренней логики
  - Маппинг Mapp response → наши Outfit/Product модели
  - Failover: если Mapp недоступен → текущая логика как fallback
- **Альтернативы:** Amazon Personalize, Algolia Recommend

#### 2. Google Vertex AI Virtual Try-On API (примерка)
- **Зачем:** Сейчас try-on — имитация (возвращает product image). Vertex AI генерирует реальное изображение человека в одежде.
- **Что нужно:**
  - GCP проект с включённым Vertex AI API
  - Image preprocessing service (валидация, ресайз, нормализация)
  - Интеграция в `TryOnService` — отправка personImage + productImage в Vertex AI
  - Обработка результата, CDN для output images
  - Signed URLs для безопасного доступа к изображениям
- **Fallback:** FASHN API как резервный провайдер

#### 3. OpenAI API (conversational stylist)
- **Зачем:** Сейчас intent extraction через keyword matching. OpenAI даст полноценное понимание естественного языка, мультимодальный анализ (фото стиля), генерацию объяснений.
- **Что нужно:**
  - API-ключ OpenAI
  - System prompt с guardrails (не комментировать тело, не обещать точность посадки)
  - Structured output parsing (function calling для извлечения constraints)
  - Мультимодальный input: текст + изображение
  - Интеграция в `StylistService`
- **Fallback:** текущий keyword parser + шаблонные ответы

#### 4. Vertex AI Search for Commerce (опционально)
- **Зачем:** AI-powered product discovery, персонализированный поиск, conversational commerce
- **Когда:** после запуска основных модулей

### Функциональные доработки

| Приоритет | Задача | Описание |
|-----------|--------|----------|
| P0 | Авторизация | Регистрация, логин, JWT, user profiles |
| P0 | Реальные изображения товаров | Сейчас цветовые круги вместо фото — нужны реальные product images |
| P0 | Consent flow для примерки | GDPR-совместимое согласие на обработку фото |
| P1 | Корзина | Add to cart, add whole outfit, checkout flow |
| P1 | Wishlist / Saved outfits | Сохранение образов и результатов примерки |
| P1 | Size profile | Профиль размеров пользователя, фильтрация по доступным размерам |
| P1 | Admin UI | Frontend для backoffice (сейчас только API) |
| P2 | A/B testing | Эксперименты: outfit block vs no block, CTA variants |
| P2 | Персонализация | История просмотров/покупок → персональные рекомендации |
| P2 | Mobile app | React Native или adaptive PWA |
| P2 | Image deletion | Удаление пользовательских фото по запросу |
| P3 | CRM hooks | Интеграция с email/push для персонализированных рекомендаций |
| P3 | Seller management | Управление продавцами, blacklist, margin rules |
| P3 | Multi-language | i18n (сейчас RU-first) |

### Нефункциональные требования (TODO)

- **Кэширование:** Redis для hot recommendations (P95 < 300ms)
- **CDN:** для output images виртуальной примерки
- **Очередь:** async queue (Celery/ARQ) для try-on jobs вместо asyncio.create_task
- **База данных:** PostgreSQL для пользователей, заказов, сохранённых образов (сейчас всё in-memory)
- **Observability:** structured logging, distributed tracing, Prometheus metrics
- **CI/CD:** GitHub Actions, Docker, staging environment
- **Безопасность:** RBAC для admin, audit logging, secrets rotation, encryption at rest

---

## Запуск

### Backend

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

### Environment Variables (`.env` в `/backend`)

```env
# Пока не требуются — всё работает в dev-режиме с mock-данными
# При подключении внешних сервисов:
OPENAI_API_KEY=sk-...
MAPP_FASHION_API_KEY=...
MAPP_FASHION_BASE_URL=https://api.mapp.com/...
VERTEX_AI_PROJECT=my-gcp-project
VERTEX_AI_LOCATION=us-central1
FASHN_API_KEY=...
```

---

## Структура проекта

```
KRG/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py              # Настройки (pydantic-settings)
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic-модели (Product, Outfit, TryOnJob, Chat...)
│   │   ├── routers/
│   │   │   ├── catalog.py             # Каталог товаров
│   │   │   ├── outfits.py             # Генерация образов
│   │   │   ├── tryon.py               # Виртуальная примерка
│   │   │   ├── stylist_chat.py        # AI-чат
│   │   │   ├── admin.py               # Backoffice
│   │   │   └── tracking.py            # Аналитика событий
│   │   ├── services/
│   │   │   ├── catalog_service.py     # Работа с каталогом (JSON)
│   │   │   ├── recommendation_service.py  # Сборка образов, color theory, scoring
│   │   │   ├── tryon_service.py       # Async job flow для примерки
│   │   │   ├── stylist_service.py     # NLU: парсинг intent → образы
│   │   │   └── business_rules.py      # Color compatibility, style coherence, filters
│   │   └── main.py                    # FastAPI app, CORS, routers
│   ├── data/
│   │   └── catalog.json               # Mock-каталог (48 товаров)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts              # HTTP-клиент (fetch)
│   │   │   └── types.ts               # TypeScript-типы
│   │   ├── components/
│   │   │   ├── catalog/               # CatalogPage, ProductCard, ProductDetail, ProductFilters
│   │   │   ├── stylist/               # StylistPage, OutfitCard, OutfitForm
│   │   │   ├── tryon/                 # TryOnPage, ImageUpload, TryOnResult
│   │   │   ├── chat/                  # ChatPage, ChatInput, ChatMessage
│   │   │   ├── layout/               # Header, Footer
│   │   │   └── ui/                    # shadcn/ui components (button, card, dialog, select...)
│   │   ├── hooks/
│   │   │   └── use-toast.ts
│   │   ├── lib/
│   │   │   └── utils.ts               # cn(), formatPrice()
│   │   ├── App.tsx                    # Routing между табами
│   │   └── main.tsx                   # Entry point
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Архитектура

```
Frontend (React + shadcn/ui)
    │
    ▼
API Gateway (FastAPI, CORS, validation)
    │
    ├── Catalog Service ──────────── catalog.json (mock) → БД (prod)
    │
    ├── Recommendation Service
    │   ├── [dev]  Category composition + Color theory + Business rules
    │   └── [prod] Mapp Fashion API → Business filters → Response
    │
    ├── Try-On Service
    │   ├── [dev]  Async simulation (3 сек)
    │   └── [prod] Vertex AI VTO API → FASHN fallback → CDN
    │
    ├── Stylist Service
    │   ├── [dev]  Keyword intent parser → Recommendation Service
    │   └── [prod] OpenAI API (NLU + multimodal) → Recommendation Service
    │
    ├── Admin Service ──────────── Rules, feature flags, provider health
    │
    └── Tracking Service ─────── Event collection → BI/Analytics
```
