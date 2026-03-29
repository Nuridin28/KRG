# AI Stylist & Virtual Try-On

Fashion-маркетплейс с AI-стилистом, виртуальной примеркой, conversational-ассистентом и админ-панелью.

Архитектурный принцип: **никаких собственных ML-моделей** — решение построено как оркестрация внешних managed AI-сервисов (Mapp Fashion, Vertex AI, OpenAI).

> Подробная инструкция по запуску: [SETUP.md](SETUP.md)

---

## Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, shadcn/ui, Radix UI, Zustand, React Router 7, Lucide Icons, Axios |
| Backend | Python 3, FastAPI 0.115, Pydantic v2, uvicorn, SQLAlchemy 2 (async), asyncpg |
| База данных | PostgreSQL (async через asyncpg) |
| Аутентификация | JWT (python-jose), bcrypt, OAuth2PasswordBearer |
| AI/ML | OpenAI API (чат-стилист + embeddings), OpenAI text-embedding-3-small (vector search), Google Vertex AI (примерка), Mapp Fashion API (рекомендации), FASHN API (fallback примерка) |

---

## Возможности

### Каталог товаров
- 48 товаров в mock-каталоге (tops, bottoms, dresses, outerwear, shoes, accessories)
- Бренды: Zara, H&M, Mango, COS, Nike, Adidas, Uniqlo, New Balance и др.
- Фильтрация: категория, стиль, пол, бренд, цвет, диапазон цен, полнотекстовый поиск
- Пагинация (20 товаров/страница)
- Детальная карточка товара (диалог): цена, размеры, материал, стиль-теги
- Рекомендации «Похожие товары» в карточке
- CTA: «Собрать образ» и «Примерить» на каждом товаре

### AI Стилист — генерация образов
- Форма: стиль (casual, office, sport, evening, street, smart_casual, date, travel), повод, пол, бюджет
- Генерация 1-3 образов с анимацией прогресса
- Category composition: top+bottom+shoes или dress+shoes+accessory
- Color theory: HSL-оценка совместимости (нейтральные, комплементарные, триадные)
- Style coherence scoring — стилевая связность комплекта
- Business rules: фильтрация по наличию, бюджету, occasion-exclusions
- Compatibility score (0-100%) для каждого образа
- Badges: «Отличное сочетание», «Всё в наличии», «Бюджетный вариант», «Премиум»
- Режим сравнения образов (side-by-side до 3 образов)
- Шеринг образов
- «Купить всё» и «Примерить» на каждом образе

### Виртуальная примерка
- Drag-n-drop загрузка фото (JPEG/PNG/WebP до 10 МБ)
- Два режима: одиночная примерка и примерка всего образа (до 5 вещей)
- Async job flow: queued -> processing -> completed/failed
- Progress bar обработки с polling (2 сек интервал)
- Валидация формата и размера изображения
- Rate limiting (20 задач/час на пользователя)
- Dual provider: Vertex AI VTO (prod) / mock-симуляция (dev)
- Сравнение До/После (side-by-side)
- CTA: «Добавить в корзину», «Собрать образ»

### AI Чат с RAG (Conversational Stylist + Vector Embeddings)
- **Semantic search (RAG):** запрос пользователя → vector embedding → cosine similarity по каталогу → top-12 релевантных товаров как контекст для LLM
- **Embedding model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Vector storage:** PostgreSQL JSON-колонка в таблице products (без внешнего vector DB)
- **Rich text representation:** для каждого товара формируется текст из name, brand, category, color, material, style_tags, occasion_tags, gender, season, description
- Batch-генерация эмбеддингов через админ-эндпоинт `POST /admin/embed-products` (100 товаров за batch)
- Чат-интерфейс с аватарами (user/bot) и typing indicator
- Два режима NLU: OpenAI gpt-4o-mini с function calling (prod) / keyword extraction (dev)
- Извлечение intent: стиль, бюджет, цвета, пол, повод — из текста на рус/англ
- LLM получает найденные через embeddings товары как system prompt context → ответы привязаны к реальному каталогу
- Structured response: ответ + extracted_filters + товары (semantic search) + образы + CTA actions
- Быстрые подсказки: «Подбери образ на свидание», «Casual лук до $200» и др.
- Карточки товаров и мини-образы прямо в ответах ассистента
- Fallback: без OpenAI API key — keyword-based search + шаблонные ответы

### Аутентификация и авторизация
- Регистрация и логин по email/password
- JWT-токены (HS256, 60 мин)
- Хеширование паролей (bcrypt)
- Role-based access: user / admin
- Защищённые эндпоинты через OAuth2PasswordBearer
- Страница авторизации с переключением login/register
- Zustand-стор + localStorage для сессии

### Корзина
- Добавление отдельных товаров и целых образов
- Управление количеством
- Подсчёт итоговой суммы
- Sidebar-drawer с анимацией
- Персистентное хранение (localStorage)

### Админ-панель
- Дашборд статистики: товары, пользователи, образы, задачи примерки, события
- Управление товарами (добавление, редактирование, удаление)
- Управление пользователями
- CRUD бизнес-правил
- Генерация vector embeddings для каталога (`POST /admin/embed-products`)
- Feature flags
- Мониторинг AI-провайдеров (health, latency)
- Доступ только для role=admin

### Аналитика и трекинг
- Batch-отправка событий (view, click, purchase, outfit_generated, try_on_started)
- Фильтрация по типу события, user_id
- PostgreSQL-backed хранение

### UI/UX
- Тёмная и светлая тема (переключатель, localStorage)
- Адаптивный дизайн (mobile-first)
- Мобильное меню (slide-out с overlay)
- Toast-уведомления
- Skeleton-loaders
- Модальные окна
- Роутинг между 7 страницами (React Router)

---

## API — 30+ эндпоинтов

Swagger-документация: `http://localhost:8000/docs`

| Группа | Метод | Эндпоинт | Описание |
|--------|-------|----------|----------|
| **Auth** | POST | `/api/v1/auth/register` | Регистрация |
| | POST | `/api/v1/auth/login` | Логин (возвращает JWT) |
| | GET | `/api/v1/auth/me` | Текущий пользователь |
| **Каталог** | GET | `/api/v1/catalog` | Список товаров с фильтрами и пагинацией |
| | GET | `/api/v1/catalog/{product_id}` | Карточка товара |
| | GET | `/api/v1/catalog/brands` | Список брендов |
| | GET | `/api/v1/catalog/colors` | Список цветов |
| | GET | `/api/v1/catalog/styles` | Список стилей |
| | GET | `/api/v1/catalog/occasions` | Список поводов |
| **Образы** | POST | `/api/v1/outfits/generate` | Генерация образов по параметрам |
| | POST | `/api/v1/outfits/by-product` | Complete the Look — образы на основе товара |
| | POST | `/api/v1/outfits/recommend/{id}` | Похожие/дополняющие товары |
| **Примерка** | POST | `/api/v1/tryon/jobs` | Создать задачу примерки (фото + товар) |
| | POST | `/api/v1/tryon/outfit-jobs` | Примерка всего образа (до 5 вещей) |
| | GET | `/api/v1/tryon/jobs/{job_id}` | Статус задачи (progress 0-100%) |
| **Чат** | POST | `/api/v1/stylist/chat` | Сообщение AI-стилисту |
| | GET | `/api/v1/stylist/suggestions` | Подсказки для начала диалога |
| **Админ** | GET | `/api/v1/admin/stats` | Дашборд статистики |
| | GET/POST | `/api/v1/admin/rules` | CRUD бизнес-правил |
| | PUT/DELETE | `/api/v1/admin/rules/{id}` | Обновление/удаление правила |
| | GET | `/api/v1/admin/providers` | Статус AI-провайдеров |
| | GET/POST | `/api/v1/admin/feature-flags` | Feature flags |
| | POST | `/api/v1/admin/embed-products` | Генерация vector embeddings для каталога |
| **Трекинг** | POST | `/api/v1/tracking/events` | Batch-отправка событий |
| | GET | `/api/v1/tracking/events` | Получение событий (фильтр) |
| **Health** | GET | `/health` | Health check |

---

## Структура проекта

```
KRG/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py              # Настройки (pydantic-settings)
│   │   │   ├── database.py            # Async SQLAlchemy engine
│   │   │   ├── auth.py                # OAuth2 dependencies
│   │   │   ├── security.py            # JWT, password hashing (bcrypt)
│   │   │   └── dependencies.py
│   │   ├── models/
│   │   │   ├── schemas.py             # Pydantic-модели (Product, Outfit, TryOnJob, Chat...)
│   │   │   ├── db_models.py           # SQLAlchemy ORM (User, Product, TrackingEvent)
│   │   │   └── auth_schemas.py        # Auth request/response модели
│   │   ├── routers/
│   │   │   ├── auth.py                # Регистрация, логин, /me
│   │   │   ├── catalog.py             # Каталог товаров
│   │   │   ├── outfits.py             # Генерация образов
│   │   │   ├── tryon.py               # Виртуальная примерка
│   │   │   ├── stylist_chat.py        # AI-чат
│   │   │   ├── admin.py               # Админ-панель (расширенная)
│   │   │   └── tracking.py            # Аналитика событий
│   │   ├── services/
│   │   │   ├── catalog_service.py     # Работа с каталогом (PostgreSQL)
│   │   │   ├── recommendation_service.py  # Сборка образов, color theory, scoring
│   │   │   ├── embedding_service.py   # Vector embeddings (OpenAI text-embedding-3-small), semantic search
│   │   │   ├── tryon_service.py       # Async job flow, Vertex AI / FASHN / mock
│   │   │   ├── stylist_service.py     # RAG: semantic search + OpenAI NLU → образы
│   │   │   └── business_rules.py      # Color compatibility, style coherence, filters
│   │   └── main.py                    # FastAPI app, lifespan, CORS, routers
│   ├── data/
│   │   └── catalog.json               # Mock-каталог (48 товаров)
│   ├── storage/                       # Сгенерированные изображения примерки
│   ├── seed_db.py                     # Инициализация БД + загрузка каталога + admin user
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts              # HTTP-клиент (кеширование, dedup, auth header)
│   │   │   └── types.ts               # TypeScript-типы
│   │   ├── components/
│   │   │   ├── catalog/               # CatalogPage, ProductCard, ProductDetail, ProductFilters
│   │   │   ├── stylist/               # StylistPage, OutfitCard, OutfitForm, OutfitComparison, ShareOutfit
│   │   │   ├── tryon/                 # TryOnPage, ImageUpload, TryOnResult
│   │   │   ├── chat/                  # ChatPage, ChatInput, ChatMessage
│   │   │   ├── auth/                  # AuthPage (login/register)
│   │   │   ├── admin/                 # AdminPage (дашборд, управление)
│   │   │   ├── cart/                  # CartDrawer (sidebar корзина)
│   │   │   ├── quiz/                  # StyleQuiz (стилевой квиз)
│   │   │   ├── layout/               # Header (адаптивный + мобильное меню), Footer
│   │   │   └── ui/                    # shadcn/ui компоненты
│   │   ├── hooks/
│   │   │   └── use-toast.ts
│   │   ├── store/
│   │   │   ├── auth.ts               # Zustand: авторизация (token, user, role)
│   │   │   ├── cart.ts               # Zustand: корзина (items, total)
│   │   │   └── navigation.ts         # Zustand: навигация между страницами (anchor product, try-on)
│   │   ├── lib/
│   │   │   └── utils.ts              # cn(), formatPrice()
│   │   ├── App.tsx                    # Роутинг (7 маршрутов), layout
│   │   └── main.tsx                   # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── README.md                          # Этот файл
└── SETUP.md                           # Инструкция по запуску
```

---

## Архитектура

```
Frontend (React 19 + shadcn/ui + Zustand)
    │
    ▼
API Gateway (FastAPI, CORS, JWT auth, validation)
    │
    ├── Auth Service ─────────────── JWT, bcrypt, role-based access
    │
    ├── Catalog Service ──────────── PostgreSQL (async SQLAlchemy)
    │
    ├── Recommendation Service
    │   ├── [dev]  Category composition + Color theory + Business rules
    │   └── [prod] Mapp Fashion API → Business filters → Response
    │
    ├── Try-On Service
    │   ├── [dev]  Async simulation (3 сек)
    │   └── [prod] Vertex AI VTO API → FASHN fallback → CDN
    │
    ├── Embedding Service ─────── OpenAI text-embedding-3-small → PostgreSQL JSON
    │
    ├── Stylist Service (RAG)
    │   ├── [dev]  Keyword intent parser → Recommendation Service
    │   └── [prod] Query → Embedding → Cosine similarity → Top-k products
    │             → OpenAI gpt-4o-mini (NLU + product context) → Recommendation Service
    │
    ├── Admin Service ──────────── Stats, rules, feature flags, provider health
    │
    └── Tracking Service ─────── Event collection → PostgreSQL → BI
```

---

## База данных

| Таблица | Описание |
|---------|----------|
| `users` | id, email (unique), hashed_password, full_name, role (user/admin), is_active, created_at |
| `products` | id, sku_id, name, brand, category, subcategory, gender, color, price, sizes (JSON), style_tags (JSON), occasion_tags (JSON), in_stock, **embedding** (JSON, 1536-dim vector), ... |
| `tracking_events` | id, event_type, user_id, product_id, outfit_id, metadata_json, timestamp |

---

## Бизнес-логика

### Color Theory (совместимость цветов)
- Нейтральные (чёрный, белый, серый, бежевый, нэви) → 90% совместимость с любым
- HSL-анализ: hue distance < 15° → аналогичные (60-85%), 120° ± 15° → триадные (75%), 180° ± 20° → комплементарные (88%)

### Style Coherence
- 8 стилей маппятся на предпочтительные подкатегории (shirt, blazer, sneakers и т.д.)
- Оценка = % предметов, соответствующих стилю

### Outfit Composition
- Полный образ: tops + bottoms + shoes ИЛИ dress + shoes
- Occasion exclusions: нет шорт/топов для офиса, нет шлёпанцев
- Budget filtering: min/max с 5% допуском

### Scoring
- Compatibility = 60% color score + 40% style score
- Badges на основе score, наличия, бюджета

---

## Что нужно сделать

### Интеграция внешних AI-сервисов

| Сервис | Статус | Описание |
|--------|--------|----------|
| **OpenAI API** | Готов к подключению | Conversational stylist — NLU, function calling, мультимодальный анализ. Fallback: keyword parser |
| **Google Vertex AI VTO** | Готов к подключению | Виртуальная примерка — генерация реального изображения. Fallback: FASHN API |
| **Mapp Fashion API** | Готов к подключению | Production-grade рекомендации. Fallback: внутренняя логика |

### Функциональные доработки

| Приоритет | Задача | Описание |
|-----------|--------|----------|
| P0 | Реальные изображения товаров | Сейчас цветовые круги — нужны фото |
| P0 | Consent flow для примерки | GDPR-совместимое согласие на обработку фото |
| P1 | Checkout flow | Оформление заказа из корзины |
| P1 | Wishlist / Saved outfits | Сохранение образов и результатов примерки |
| P1 | Size profile | Профиль размеров, фильтрация по доступным |
| P2 | A/B testing | Эксперименты: CTA variants, outfit block |
| P2 | Персонализация | История → персональные рекомендации |
| P2 | Mobile app | React Native или adaptive PWA |
| P3 | CRM hooks | Email/push рекомендации |
| P3 | Multi-language | i18n (сейчас RU-first) |

### Нефункциональные требования (TODO)

- **Кэширование:** Redis для hot recommendations (P95 < 300ms)
- **CDN:** для output images виртуальной примерки
- **Очередь:** Celery/ARQ для try-on jobs вместо asyncio.create_task
- **Observability:** structured logging, distributed tracing, Prometheus metrics
- **CI/CD:** GitHub Actions, Docker, staging environment
- **Безопасность:** audit logging, secrets rotation, encryption at rest
