# Запуск проекта

## Требования

- **Python** 3.11+
- **Node.js** 18+ и npm
- **PostgreSQL** 14+
- (Опционально) API-ключи: OpenAI, Google Vertex AI, Mapp Fashion, FASHN

> Без внешних API-ключей проект полностью работает в dev-режиме с mock-данными и встроенной логикой.

---

## 1. PostgreSQL

Создайте базу данных:

```bash
createdb krg_stylist
```

Или через psql:

```sql
CREATE DATABASE krg_stylist;
```

---

## 2. Backend

```bash
cd backend
```

### Установка зависимостей

```bash
pip install -r requirements.txt
```

### Настройка окружения

Скопируйте `.env.example` в `.env` и отредактируйте:

```bash
cp .env.example .env
```

Основные переменные:

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/krg_stylist` |
| `SECRET_KEY` | Ключ для JWT-подписи (сменить в production!) | `change-me-...` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни JWT-токена | `60` |
| `OPENAI_API_KEY` | Ключ OpenAI (опционально) | — |
| `VERTEX_AI_PROJECT` | GCP Project ID (опционально) | — |
| `FASHN_API_KEY` | Ключ FASHN API (опционально) | — |
| `CORS_ORIGINS` | Разрешённые frontend-домены | `["http://localhost:5173"]` |

Полный список переменных — в файле `.env.example`.

### Инициализация базы данных

```bash
python seed_db.py
```

Скрипт:
- Создаст все таблицы (users, products, tracking_events)
- Загрузит 48 товаров из `data/catalog.json`
- Создаст админ-пользователя: `admin@krg.com` / `admin123`

### Запуск сервера

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Проверка:
- API: http://localhost:8000/health
- Swagger-документация: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 3. Frontend

```bash
cd frontend
```

### Установка зависимостей

```bash
npm install
```

### Настройка окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `VITE_API_BASE` | URL бэкенда | `http://localhost:8000/api/v1` |

### Запуск dev-сервера

```bash
npm run dev
```

UI: http://localhost:5173

### Production build

```bash
npm run build
npm run preview
```

---

## 4. Быстрый старт (всё вместе)

Терминал 1 — Backend:

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env: укажите DATABASE_URL
python seed_db.py
python -m uvicorn app.main:app --reload --port 8000
```

Терминал 2 — Frontend:

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

---

## 5. Учётные записи

| Email | Пароль | Роль | Описание |
|-------|--------|------|----------|
| `admin@krg.com` | `admin123` | admin | Полный доступ + админ-панель |

Новых пользователей можно создать через страницу регистрации или API:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "mypass123", "full_name": "John Doe"}'
```

---

## 6. Подключение внешних AI-сервисов

### OpenAI (Conversational Stylist)

1. Получите API-ключ: https://platform.openai.com/api-keys
2. Добавьте в `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Перезапустите backend

Без ключа чат работает через keyword-based intent extraction (fallback).

### Google Vertex AI (Virtual Try-On)

1. Создайте GCP-проект и включите Vertex AI API
2. Настройте аутентификацию: `gcloud auth application-default login`
3. Добавьте в `.env`:
   ```
   VERTEX_AI_PROJECT=my-gcp-project
   VERTEX_AI_LOCATION=us-central1
   ```
4. Перезапустите backend

Без настройки примерка работает в режиме mock-симуляции (3 сек задержка).

### FASHN API (Fallback Try-On)

1. Получите ключ: https://fashn.ai
2. Добавьте в `.env`:
   ```
   FASHN_API_KEY=fa-...
   FASHN_BASE_URL=https://api.fashn.ai/v1
   ```

### Mapp Fashion (Recommendations)

1. Заключите контракт с Mapp и получите API-ключи
2. Добавьте в `.env`:
   ```
   MAPP_FASHION_API_KEY=...
   MAPP_FASHION_BASE_URL=https://api.mapp.com/...
   ```

Без ключа рекомендации работают через встроенную логику (color theory + style coherence).

---

## 7. Полезные команды

| Команда | Описание |
|---------|----------|
| `python seed_db.py` | Инициализация БД и загрузка данных |
| `python -m uvicorn app.main:app --reload --port 8000` | Backend dev-сервер |
| `npm run dev` | Frontend dev-сервер |
| `npm run build` | Production build frontend |
| `npm run lint` | Проверка кода (ESLint) |

---

## Troubleshooting

### Backend не стартует: `connection refused`
PostgreSQL не запущен. Запустите:
```bash
# macOS (Homebrew)
brew services start postgresql@16

# Linux
sudo systemctl start postgresql
```

### `relation "users" does not exist`
Запустите seed-скрипт:
```bash
cd backend && python seed_db.py
```

### Frontend: `CORS error`
Проверьте, что `CORS_ORIGINS` в `.env` бэкенда содержит URL фронтенда (по умолчанию `http://localhost:5173`).

### Frontend: `Network Error` / запросы не проходят
Убедитесь, что backend запущен на порту 8000 и `VITE_API_BASE` в `.env` фронтенда указывает на правильный URL.
