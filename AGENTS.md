# Agent Instructions

## Stack
- **Backend**: FastAPI (Python) — `backend/app/`
- **Frontend**: Next.js 14 App Router (TypeScript) — `frontend/app/`
- **Widget**: Vanilla JS — `widget/nexusai.js`
- **Infra**: PostgreSQL + pgvector, Redis, Celery workers

## Deployment
- **Backend**: Railway — auto-deploys from GitHub `main` branch (no CLI needed)
- **Backend URL**: `https://wonderful-strength-production-a598.up.railway.app`
- **Frontend**: Vercel — auto-deploys from GitHub `main` branch (no CLI needed)
- **GitHub repo**: `tech-hive-dev/nexusai`
- Push to `main` → both Railway and Vercel redeploy automatically

### Vercel Config
- `vercel.json` rewrites `/api/*` → Railway backend URL
- `NEXT_PUBLIC_API_URL` must be **empty string `""`** in Vercel dashboard (uses relative paths)
  - If set to `http://localhost:8000`, browser fails with "Failed to fetch"
- Local dev: `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`

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

# Alembic migrations (schema changes only — runtime migrations via _MIGRATIONS in main.py)
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
- **Runtime migrations**: New columns go in `_MIGRATIONS` list in `backend/app/main.py`
  - Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — idempotent, runs at every startup
  - Do NOT rely on `init.sql` for live DB schema changes — it only runs on fresh DB

### Frontend (Next.js)
- App router under `frontend/app/`; dashboard pages at `app/dashboard/`
- State management: Zustand stores
- Data fetching: SWR + axios (`NEXT_PUBLIC_API_URL`)
- Styling: Tailwind CSS
- `useSearchParams()` must be inside a `<Suspense>` boundary (Next.js build requirement)

## AI / Model IDs
- **Anthropic Sonnet**: `claude-sonnet-4-6` (in `backend/app/core/config.py`)
- **Anthropic Haiku**: `claude-haiku-4-5-20251001` (used in sentiment, fast tasks)
- **OpenAI embeddings**: `text-embedding-3-small` (optional; knowledge base RAG)
- ⚠️ `claude-3-5-sonnet-latest` and `claude-3-5-haiku-latest` are **invalid** — will 404

## Known Patterns & Gotchas

### SQLAlchemy + asyncpg Transaction Safety
- If a DB statement inside an active transaction fails, asyncpg marks the **entire transaction** as aborted
- Subsequent statements fail with `InFailedSQLTransactionError` even if Python caught the exception
- **Fix**: Use `async with db.begin_nested():` (SAVEPOINT) to isolate risky queries
- Applied in `backend/app/services/knowledge.py` `search_knowledge()` — failure rolls back only the savepoint

### PostgreSQL Column Types
- `TEXT[]` columns must use `ARRAY(String)` in SQLAlchemy — **not** `JSON`
- Example: `Customer.tags` — wrong type causes `DatatypeMismatchError` on INSERT

### FastAPI Error Surfacing
- Unhandled exceptions return plain `500 Internal Server Error` (not JSON)
- Wrap endpoint logic in try/except → `HTTPException(500, detail=f"{type(e).__name__}: {str(e)}")`
- Pattern used in `backend/app/api/chat.py`: outer handler catches, inner `_*_inner()` function does work

### Auth / Login Flow
- Successful login always redirects to `/dashboard`
- New registrations redirect to `/onboarding`
- `onboarding_completed=false` on existing tenant does NOT redirect to `/onboarding` on login

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
- Codex will review your code when you are done
## Important: Source of Truth
- **Always consult GitHub repo** for current file contents — local files may be outdated
- All code changes must be pushed to `main` branch to take effect on Railway/Vercel
