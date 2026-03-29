# AI Stylist & Virtual Try-On

Fashion-маркетплейс с AI-стилистом, виртуальной примеркой, conversational-ассистентом, персональным гардеробом, образом дня и админ-панелью.

Архитектурный принцип: **никаких собственных ML-моделей** — решение построено как оркестрация внешних managed AI-сервисов (Mapp Fashion, Vertex AI, Google Veo, OpenAI).

> Подробная инструкция по запуску: [SETUP.md](SETUP.md) | Структура БД: [DATABASE.md](DATABASE.md)

---

## Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, shadcn/ui, Radix UI, Zustand, React Router 7, Lucide Icons, Axios |
| Backend | Python 3, FastAPI 0.115, Pydantic v2, uvicorn, SQLAlchemy 2 (async), asyncpg |
| База данных | PostgreSQL (async через asyncpg) |
| Аутентификация | JWT (python-jose), bcrypt, OAuth2PasswordBearer |
| AI/ML | OpenAI API (чат-стилист + embeddings + GPT Vision), OpenAI text-embedding-3-small (vector search), Google Vertex AI (примерка), Google Veo (видео), Mapp Fashion API (рекомендации), FASHN API (fallback примерка) |

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
- Шеринг образов по ссылке
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
- Генерация motion-видео из результата примерки (Google Veo)
- Quick try-on: быстрая примерка из сохранённого фото профиля
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

### Персональный гардероб и капсульный анализ
- Загрузка фото одежды — GPT Vision распознаёт категорию, цвет, стиль
- Добавление вещей из каталога в гардероб
- Ручное добавление вещей
- Капсульный анализ: оценка гардероба, рекомендации по заполнению пробелов
- Удаление вещей из гардероба

### Образ дня (Daily Outfit)
- Персональная рекомендация на каждый день с учётом предпочтений и погоды
- Интеграция с погодным API (OpenWeatherMap + wttr.in fallback)
- Генерация на лету при первом запросе + кеширование на день
- Перегенерация образа по запросу
- Админ-эндпоинт: массовая генерация для всех пользователей с настройками

### Профиль пользователя
- Настройки предпочтений: любимые стили, пол, город (для погоды)
- Загрузка фото для примерки (макс. 3 фото, до 10 МБ)
- Установка фото по умолчанию для быстрой примерки
- Quick try-on: примерка товара в один клик по сохранённому фото

### Сохранённые образы и история
- Сохранение сгенерированных образов
- История образов с пагинацией
- Удаление образов из истории
- Публичный шеринг образа по ссылке (без авторизации)

### Конструктор образов (Outfit Builder)
- Ручная сборка образа из товаров каталога

### Вишлист
- Избранные товары

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
- Управление товарами (добавление, редактирование, удаление с загрузкой изображений)
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
- Роутинг между 14 страницами (React Router)

---

## API — 50+ эндпоинтов

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
| **Сохранённые** | POST | `/api/v1/outfits/save` | Сохранить образ |
| | GET | `/api/v1/outfits/history` | История образов (limit 1-100) |
| | DELETE | `/api/v1/outfits/history/{outfit_id}` | Удалить сохранённый образ |
| | GET | `/api/v1/outfits/shared/{outfit_id}` | Публичный просмотр образа (без auth) |
| **Примерка** | POST | `/api/v1/tryon/jobs` | Создать задачу примерки (фото + товар) |
| | POST | `/api/v1/tryon/outfit-jobs` | Примерка всего образа (до 5 вещей) |
| | GET | `/api/v1/tryon/jobs/{job_id}` | Статус задачи (progress 0-100%) |
| **Видео** | POST | `/api/v1/video/generate` | Генерация motion-видео из результата примерки (Google Veo) |
| | GET | `/api/v1/video/jobs/{job_id}` | Статус видео-задачи |
| **Чат** | POST | `/api/v1/stylist/chat` | Сообщение AI-стилисту |
| | GET | `/api/v1/stylist/suggestions` | Подсказки для начала диалога |
| **Профиль** | POST | `/api/v1/profile/photos` | Загрузка фото пользователя (макс. 3) |
| | GET | `/api/v1/profile/photos` | Список фото пользователя |
| | DELETE | `/api/v1/profile/photos/{photo_id}` | Удаление фото |
| | PUT | `/api/v1/profile/photos/{photo_id}/default` | Установить фото по умолчанию |
| | POST | `/api/v1/profile/quick-tryon` | Быстрая примерка по сохранённому фото |
| | GET | `/api/v1/profile/preferences` | Получить предпочтения пользователя |
| | PUT | `/api/v1/profile/preferences` | Обновить предпочтения |
| **Гардероб** | GET | `/api/v1/wardrobe/items` | Список вещей в гардеробе |
| | POST | `/api/v1/wardrobe/upload` | Загрузка фото одежды (GPT Vision) |
| | POST | `/api/v1/wardrobe/items` | Добавить вещь вручную |
| | DELETE | `/api/v1/wardrobe/items/{item_id}` | Удалить вещь из гардероба |
| | POST | `/api/v1/wardrobe/analyze` | Капсульный анализ гардероба |
| **Образ дня** | GET | `/api/v1/daily-outfit` | Образ дня (генерация on-the-fly) |
| | POST | `/api/v1/daily-outfit/regenerate` | Перегенерация образа дня |
| | POST | `/api/v1/daily-outfit/generate-all` | Админ: генерация для всех пользователей |
| **Админ** | GET | `/api/v1/admin/stats` | Дашборд статистики |
| | GET/POST | `/api/v1/admin/rules` | CRUD бизнес-правил |
| | PUT/DELETE | `/api/v1/admin/rules/{id}` | Обновление/удаление правила |
| | GET/POST/PUT/DELETE | `/api/v1/admin/products` | CRUD товаров |
| | POST | `/api/v1/admin/upload-image` | Загрузка изображения товара |
| | GET | `/api/v1/admin/users` | Список пользователей |
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
│   │   │   ├── schemas.py             # Pydantic-модели (Product, Outfit, TryOnJob, Chat, Video...)
│   │   │   ├── db_models.py           # SQLAlchemy ORM (7 таблиц)
│   │   │   └── auth_schemas.py        # Auth request/response модели
│   │   ├── routers/
│   │   │   ├── auth.py                # Регистрация, логин, /me
│   │   │   ├── catalog.py             # Каталог товаров
│   │   │   ├── outfits.py             # Генерация образов
│   │   │   ├── saved_outfits.py       # Сохранение, история, шеринг образов
│   │   │   ├── tryon.py               # Виртуальная примерка
│   │   │   ├── video.py               # Генерация видео (Google Veo)
│   │   │   ├── stylist_chat.py        # AI-чат
│   │   │   ├── profile.py             # Фото пользователя, предпочтения, quick try-on
│   │   │   ├── wardrobe.py            # Гардероб и капсульный анализ
│   │   │   ├── daily_outfit.py        # Образ дня (погода + предпочтения)
│   │   │   ├── admin.py               # Админ-панель (расширенная)
│   │   │   └── tracking.py            # Аналитика событий
│   │   ├── services/
│   │   │   ├── catalog_service.py     # Работа с каталогом (PostgreSQL)
│   │   │   ├── recommendation_service.py  # Сборка образов, color theory, scoring
│   │   │   ├── embedding_service.py   # Vector embeddings (OpenAI text-embedding-3-small), semantic search
│   │   │   ├── tryon_service.py       # Async job flow, Vertex AI / FASHN / mock
│   │   │   ├── veo_service.py         # Google Veo: image-to-video генерация
│   │   │   ├── stylist_service.py     # RAG: semantic search + OpenAI NLU → образы
│   │   │   ├── capsule_service.py     # GPT Vision анализ фото + капсульные рекомендации
│   │   │   ├── daily_outfit_service.py # Генерация образа дня (погода + стиль)
│   │   │   ├── weather_service.py     # OpenWeatherMap + wttr.in fallback
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
│   │   │   ├── builder/              # OutfitBuilderPage (ручной конструктор образов)
│   │   │   ├── wardrobe/             # WardrobePage, CapsuleAnalysis
│   │   │   ├── daily/                # DailyOutfitPage (образ дня)
│   │   │   ├── profile/              # ProfilePage, ProfilePhotos, PreferencesForm
│   │   │   ├── history/              # OutfitHistoryPage (сохранённые образы)
│   │   │   ├── shared/               # SharedOutfitPage (публичный просмотр)
│   │   │   ├── wishlist/             # WishlistPage (избранное)
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
│   │   │   ├── navigation.ts         # Zustand: навигация между страницами (anchor product, try-on)
│   │   │   ├── profile.ts            # Zustand: профиль пользователя
│   │   │   ├── wardrobe.ts           # Zustand: гардероб
│   │   │   └── wishlist.ts           # Zustand: вишлист
│   │   ├── lib/
│   │   │   └── utils.ts              # cn(), formatPrice()
│   │   ├── App.tsx                    # Роутинг (14 маршрутов), layout
│   │   └── main.tsx                   # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── README.md                          # Этот файл
├── DATABASE.md                        # Структура базы данных (7 таблиц)
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
    ├── Veo Service ───────────── Google Veo: image-to-video из результата примерки
    │
    ├── Embedding Service ─────── OpenAI text-embedding-3-small → PostgreSQL JSON
    │
    ├── Stylist Service (RAG)
    │   ├── [dev]  Keyword intent parser → Recommendation Service
    │   └── [prod] Query → Embedding → Cosine similarity → Top-k products
    │             → OpenAI gpt-4o-mini (NLU + product context) → Recommendation Service
    │
    ├── Capsule Service ───────── GPT Vision: анализ фото одежды + рекомендации
    │
    ├── Daily Outfit Service ──── Погода (OpenWeatherMap/wttr.in) + предпочтения → образ дня
    │
    ├── Weather Service ───────── OpenWeatherMap API + wttr.in fallback + кеширование
    │
    ├── Profile Service ───────── Фото пользователя, предпочтения, quick try-on
    │
    ├── Admin Service ──────────── Stats, rules, products CRUD, feature flags, provider health
    │
    └── Tracking Service ─────── Event collection → PostgreSQL → BI
```

---

## База данных

7 таблиц в PostgreSQL (подробнее в [DATABASE.md](DATABASE.md)):

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи: email, пароль, роль, предпочтения стилей, город |
| `products` | Каталог товаров: 48 позиций, style/occasion теги, vector embedding (1536-dim) |
| `saved_outfits` | Сохранённые образы: items, score, badges, explanation |
| `tracking_events` | Аналитика: event_type, user_id, product_id, metadata |
| `user_photos` | Фото пользователей для быстрой примерки (макс. 3 на пользователя) |
| `wardrobe_items` | Персональный гардероб: категория, цвет, стиль-теги, фото |
| `daily_outfits` | Образ дня: outfit JSON, погода, температура (unique per user+date) |

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

## Фронтенд-маршруты

| Маршрут | Компонент | Доступ |
|---------|-----------|--------|
| `/catalog` | CatalogPage | Публичный |
| `/stylist` | StylistPage | Публичный |
| `/tryon` | TryOnPage | Публичный |
| `/chat` | ChatPage | Публичный |
| `/builder` | OutfitBuilderPage | Публичный |
| `/wishlist` | WishlistPage | Публичный |
| `/history` | OutfitHistoryPage | Публичный |
| `/daily` | DailyOutfitPage | Публичный |
| `/outfit/:outfitId` | SharedOutfitPage | Публичный (шеринг) |
| `/auth` | AuthPage | Гостевой |
| `/profile` | ProfilePage | Авторизованный |
| `/wardrobe` | WardrobePage | Авторизованный |
| `/admin` | AdminPage | Только admin |

---

## Статус интеграций

| Сервис | Статус | Описание |
|--------|--------|----------|
| **OpenAI API** | Подключён | Conversational stylist (gpt-4o-mini) + vector embeddings (text-embedding-3-small) + GPT Vision (анализ одежды). Fallback: keyword parser |
| **Google Vertex AI VTO** | Готов к подключению | Виртуальная примерка — генерация реального изображения. Сейчас: mock-симуляция. Fallback: FASHN API |
| **Google Veo** | Готов к подключению | Image-to-video генерация из результата примерки |
| **Mapp Fashion API** | Готов к подключению | Production-grade рекомендации. Сейчас: внутренняя логика (color theory + style coherence) |
| **OpenWeatherMap** | Подключён | Погода для образа дня. Fallback: wttr.in |
