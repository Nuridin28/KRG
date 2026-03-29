# Структура базы данных

PostgreSQL (async через asyncpg + SQLAlchemy 2)

---

## users

Пользователи платформы.

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | SERIAL | PK | |
| email | VARCHAR(255) | UNIQUE, INDEX | |
| hashed_password | VARCHAR(255) | NOT NULL | bcrypt |
| full_name | VARCHAR(255) | DEFAULT '' | |
| role | VARCHAR(20) | DEFAULT 'user' | `user` / `admin` |
| is_active | BOOLEAN | DEFAULT true | |
| preferred_styles | JSONB | NULLABLE | Массив стилей: `["casual", "office"]` |
| preferred_gender | VARCHAR(20) | NULLABLE | `male` / `female` / `unisex` |
| city | VARCHAR(100) | NULLABLE | Город для погоды в «Образе дня» |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Дефолтный админ:** `admin@krg.com` / `admin123` (создаётся через `seed_db.py`)

---

## products

Каталог товаров (48 mock-товаров загружаются из `data/catalog.json`).

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | VARCHAR(50) | PK | e.g. `top-001`, `shoe-003` |
| sku_id | VARCHAR(100) | NOT NULL | Артикул |
| name | VARCHAR(255) | NOT NULL | Название |
| brand | VARCHAR(100) | INDEX | Бренд |
| category | VARCHAR(50) | INDEX | `tops`, `bottoms`, `dresses`, `outerwear`, `shoes`, `accessories` |
| subcategory | VARCHAR(50) | NOT NULL | e.g. `t-shirt`, `jeans`, `sneakers` |
| gender | VARCHAR(20) | INDEX | `male`, `female`, `unisex` |
| description | TEXT | DEFAULT '' | |
| color | VARCHAR(50) | NOT NULL | |
| color_name | VARCHAR(50) | NOT NULL | e.g. `Black`, `Navy` |
| color_hex | VARCHAR(10) | NOT NULL | e.g. `#0D0D0D` |
| pattern | VARCHAR(50) | DEFAULT 'solid' | `solid`, `striped`, `plaid`, etc. |
| fit | VARCHAR(50) | DEFAULT 'regular' | `slim`, `regular`, `oversized` |
| material | VARCHAR(255) | DEFAULT '' | |
| price | FLOAT | NOT NULL | |
| promo_price | FLOAT | NULLABLE | Цена со скидкой |
| currency | VARCHAR(10) | DEFAULT 'USD' | |
| sizes | JSON | DEFAULT [] | `["S", "M", "L", "XL"]` |
| in_stock | BOOLEAN | DEFAULT true | |
| image_url | TEXT | NOT NULL | URL изображения |
| style_tags | JSON | DEFAULT [] | `["casual", "street"]` |
| occasion_tags | JSON | DEFAULT [] | `["daily", "work"]` |
| season | VARCHAR(50) | DEFAULT 'all' | `all`, `summer`, `winter`, etc. |
| seller_id | VARCHAR(100) | DEFAULT 'marketplace' | |
| embedding | JSON | NULLABLE | Vector embedding (1536 dims, OpenAI text-embedding-3-small) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## saved_outfits

Сохранённые пользователями образы.

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | VARCHAR(50) | PK | e.g. `outfit-a1b2c3d4` |
| user_id | INTEGER | NULLABLE, INDEX | FK → users.id |
| items_json | JSON | DEFAULT [] | Массив товаров в образе |
| style | VARCHAR(50) | DEFAULT '' | |
| occasion | VARCHAR(50) | DEFAULT '' | |
| total_price | FLOAT | DEFAULT 0 | |
| compatibility_score | FLOAT | DEFAULT 0 | 0–100 |
| explanation | TEXT | DEFAULT '' | |
| badges | JSON | DEFAULT [] | `["Отличное сочетание", "Всё в наличии"]` |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## tracking_events

Аналитика действий пользователей.

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | SERIAL | PK | |
| event_type | VARCHAR(50) | INDEX | `view`, `click`, `purchase`, `outfit_generated`, `try_on_started` |
| user_id | VARCHAR(100) | INDEX, DEFAULT 'anonymous' | |
| product_id | VARCHAR(50) | NULLABLE | |
| outfit_id | VARCHAR(50) | NULLABLE | |
| metadata_json | JSON | DEFAULT {} | Доп. данные события |
| timestamp | TIMESTAMPTZ | DEFAULT now() | |

---

## user_photos

Сохранённые фото пользователей для примерки в один клик (макс. 3 на пользователя).

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | SERIAL | PK | |
| user_id | INTEGER | INDEX | FK → users.id |
| image_path | VARCHAR(500) | NOT NULL | Путь: `users/{user_id}/{filename}.jpg` |
| is_default | BOOLEAN | DEFAULT false | Фото по умолчанию для quick try-on |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## wardrobe_items

Персональный гардероб пользователя. Вещи добавляются через загрузку фото (GPT Vision распознаёт) или из каталога.

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | SERIAL | PK | |
| user_id | INTEGER | INDEX | FK → users.id |
| product_id | VARCHAR(50) | NULLABLE | Если добавлено из каталога |
| category | VARCHAR(50) | NOT NULL | `tops`, `bottoms`, `shoes`, etc. |
| name | VARCHAR(255) | DEFAULT '' | Название (от GPT Vision или каталога) |
| color_name | VARCHAR(50) | DEFAULT '' | |
| color_hex | VARCHAR(10) | DEFAULT '' | |
| image_url | TEXT | DEFAULT '' | Фото вещи (загруженное или из каталога) |
| style_tags | JSON | DEFAULT [] | `["casual", "office"]` |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## daily_outfits

Персональный «Образ дня» — генерируется с учётом предпочтений и погоды.

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| id | SERIAL | PK | |
| user_id | INTEGER | INDEX | FK → users.id |
| date | VARCHAR(10) | INDEX, UQ(user_id, date) | `2026-03-29` |
| outfit_json | JSON | NOT NULL | Сериализованный Outfit (items, score, badges, etc.) |
| weather_summary | VARCHAR(200) | DEFAULT '' | e.g. `sunny, 18.0°C` |
| temperature_c | FLOAT | NULLABLE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## ER-диаграмма (текстовая)

```
users ──1:N──► user_photos      (фото для примерки)
users ──1:N──► wardrobe_items   (персональный гардероб)
users ──1:N──► daily_outfits    (образ дня)
users ──1:N──► saved_outfits    (сохранённые образы)
users ──1:N──► tracking_events  (аналитика)

products ──────► wardrobe_items.product_id  (если добавлено из каталога)
products ──────► saved_outfits.items_json   (JSON, товары в образе)
products ──────► tracking_events.product_id (отслеживание)
```

---

## Инициализация

```bash
cd backend
python seed_db.py
```

Скрипт:
1. Создаёт все таблицы (`CREATE TABLE IF NOT EXISTS`)
2. Загружает 48 товаров из `data/catalog.json` в `products`
3. Создаёт admin-пользователя `admin@krg.com` / `admin123`

При запуске сервера (`uvicorn`) таблицы создаются автоматически через `Base.metadata.create_all`, а новые колонки в `users` добавляются через `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
