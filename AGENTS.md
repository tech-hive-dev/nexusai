# Agent Instructions

## Stack
- **Backend**: FastAPI (Python) — `backend/app/`
- **Frontend**: Next.js 14 App Router (TypeScript) — `frontend/app/`
- **Widget**: Vanilla JS — `widget/nexusai.js`
- **Infra**: PostgreSQL + pgvector, Redis, Celery workers

## Running Services
```bash
docker compose up          # all services
docker compose up backend  # backend only (port 8000)
cd frontend && npm run dev # frontend only (port 3000)
```

## Backend Commands
```bash
# From /backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Alembic migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Frontend Commands
| Task | Command |
|------|---------|
| Dev server | `cd frontend && npm run dev` |
| Build | `cd frontend && npm run build` |
| Typecheck | `cd frontend && npx tsc --noEmit` |

## Key Conventions

### Backend (FastAPI)
- Routes in `backend/app/api/<resource>.py` — one file per resource
- SQLAlchemy async models in `backend/app/models/`
- Route prefix: `/api/<resource>` (except webhooks: `/webhooks`)
- Multi-tenant: all data scoped by `tenant_id`
- Auth: JWT via `python-jose`; inject current user via FastAPI deps

### Frontend (Next.js)
- App router under `frontend/app/`; dashboard pages at `app/dashboard/`
- State management: Zustand stores
- Data fetching: SWR + axios (`NEXT_PUBLIC_API_URL`)
- Styling: Tailwind CSS

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
