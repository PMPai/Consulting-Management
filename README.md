# 顾问项目 ROI 管理台 (Consulting Project ROI Management)

PrecisionData 精铭数据 — 咨询项目管理和客户 ROI 分析平台

Built with FastAPI + React + TypeScript + PostgreSQL, running entirely in Docker.

## Quick Start (Docker — works on Windows, Mac, and Linux)

```bash
# 1. Clone and enter the repo
git clone https://github.com/PMPai/Consulting-Management.git
cd Consulting-Management

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
docker compose up -d

# 4. (First time only) Seed demo data
docker exec consulting-management-backend-1 sh -c "ALLOW_SEED=true python -m app.seed"

# 5. Access the application
#    Frontend:  http://localhost:8898
#    Backend:   http://localhost:8000
#    API Docs:  http://localhost:8000/docs
#    Login:     admin@demo.com / demo1234
```

**Prerequisites**: Docker Desktop (Mac or Windows) or Docker Engine + Docker Compose (Linux).

No local Python, Node.js, or PostgreSQL installation required.

## Architecture

```
Consulting-Management/
├── docker-compose.yml              # 3 services: db, backend, frontend
├── .env.example                    # Environment template
├── assets/                         # Brand assets (logo, dashboard reference)
├── backend/                        # FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── main.py                 # FastAPI entry, CORS, middleware, routes
│   │   ├── config.py               # Pydantic settings
│   │   ├── database.py             # SQLAlchemy engine
│   │   ├── models/                 # 16 entities (org, user, role_rate, client,
│   │   │                           #   project, phase, milestone, time_entry, work_record,
│   │   │                           #   expense, revenue, investment, benefit, api_key,
│   │   │                           #   audit_log, project_file)
│   │   ├── schemas/                # Pydantic request/response models
│   │   ├── domain/                 # Pure Python business logic (ROI, profit, timer, graph)
│   │   ├── auth/                   # JWT + bcrypt password hashing
│   │   ├── api/routes/             # 13 route modules (47 API endpoints)
│   │   ├── services/crud.py        # Shared CRUD: org isolation, soft-delete, optimistic lock
│   │   ├── middleware/audit.py     # Audit logging middleware
│   │   └── seed.py                 # Demo data (env-gated)
│   ├── alembic/versions/           # 3 reversible migrations
│   ├── tests/                      # 29 pytest domain tests
│   ├── Dockerfile                  # python:3.12-slim + gcc + libpq-dev
│   ├── .dockerignore
│   └── pyproject.toml
├── frontend/                       # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx                # Entry with QueryClient + AuthProvider
│   │   ├── App.tsx                 # Sidebar + topbar layout, theme toggle
│   │   ├── index.css               # Design tokens (CSS variables), light/dark themes
│   │   ├── pages/                  # 9 pages
│   │   │   ├── Dashboard.tsx       # KPI cards + Gantt chart + bar chart + phase health
│   │   │   ├── Projects.tsx        # CRUD + inline phases + file uploads
│   │   │   ├── TimeTracking.tsx    # Timer + manual entries + CSV export
│   │   │   ├── Expenses.tsx        # Merged expenses + KPI summary
│   │   │   ├── ClientROI.tsx       # ROI KPIs + investments + benefits
│   │   │   ├── Reports.tsx         # 5 report types + CSV export
│   │   │   ├── ApiIntegrations.tsx # API URL + docs link
│   │   │   ├── Settings.tsx        # Role rates management
│   │   │   └── Login.tsx           # Login + initial setup
│   │   └── lib/
│   │       ├── api.ts              # Fetch-based API client
│   │       └── auth.tsx            # Auth context (login/logout/setup)
│   ├── public/branding/            # Logo (ASCII filename: precisiondata-logo.png)
│   ├── tests/                      # 26 Playwright E2E tests
│   ├── Dockerfile                  # node:22-alpine, port 8898
│   ├── .dockerignore
│   ├── vite.config.ts              # Chunk splitting config
│   ├── playwright.config.ts
│   └── package.json
└── .gitignore
```

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| Owner | Full admin: users, API keys, audit logs, role rates, all data |
| Assistant | Full access (same as Owner) |
| Consultant | Read + write all business data within the organization |
| Viewer | Read-only access to all org data |

Role rates (internal cost rate + client billing rate) are configurable in Settings.

## Key Features

- **Project management**: Create projects with total_quote, final_goal, notes, and inline phase creation (KPI definition, milestone goal, estimated expense per phase)
- **Gantt chart**: Date axis on top, phase bars with completion %, estimated expense labels, today marker, expandable detail rows (KPI/expense variance)
- **Time tracking**: Server-authoritative timer (start/pause/resume/stop), manual entries, work records with visibility levels, CSV export
- **File uploads**: Contracts, agreements, attachments — upload, download, delete
- **Financial calculations**: ROI (project-lifetime, null when incomplete), consultant profit/margin, quote-based profit
- **Design system**: Engineering-grade B2B dashboard style (Linear/Vercel/Stripe), design tokens via CSS variables, dark/light theme, tabular-nums, SVG icons
- **Cross-platform**: Docker-based, no Windows-specific dependencies, ASCII filenames, `pathlib.Path` for all file operations

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql+psycopg://...@db:5432/consulting | Database connection |
| JWT_SECRET | (generated) | JWT signing secret |
| JWT_EXPIRE_MINUTES | 60 | Access token expiry |
| CORS_ORIGINS | http://localhost:8898 | Allowed CORS origins |
| ALLOW_SEED | false | Allow seed data execution |
| UPLOAD_DIR | ./uploads | File upload directory |
| VITE_API_BASE_URL | http://localhost:8000/api/v1 | Frontend API base URL |

## Database Migrations

```bash
# Inside Docker container
docker exec consulting-management-backend-1 alembic upgrade head
docker exec consulting-management-backend-1 alembic downgrade -1
docker exec consulting-management-backend-1 alembic current
```

3 migrations: initial schema → remove webhooks → add assistant role + project/phase enhancements + file uploads.

## Testing

```bash
# Backend domain tests (29 tests)
docker exec consulting-management-backend-1 python -m pytest tests/ -v

# Frontend E2E tests (26 tests) — requires running services
cd frontend
npx playwright test --reporter=list

# Frontend type check + production build
cd frontend
npx tsc --noEmit
npx vite build
```

## API Overview

47 endpoints under `/api/v1`:

- **Auth**: login, refresh, logout, setup, me
- **CRUD + restore**: clients, projects, phases, milestones, time-entries, tool-expenses, revenue-entries, client-investments, benefit-entries
- **Timer**: start, stop, pause, resume
- **Files**: upload, download, delete, list
- **Role rates**: list, update per role
- **API keys**: create, list, revoke
- **Audit logs**: list (read-only)
- **Aggregations**: dashboard, gantt, time-summary, financial-summary, roi-summary

Interactive docs at `http://localhost:8000/docs`.

## ROI Formula

```
Verified benefit = sum of benefit_entries where status = "verified"
Client investment = sum of client_investments where status = "confirmed"
Net benefit = verified benefit - client investment
ROI = net benefit / client investment × 100%
```

- Project-lifetime scoped (ignores date selector)
- Returns `null` + "无法计算" when investment is zero/missing
- Estimated benefits never count toward official ROI

## Production Build

Frontend chunk splitting:
- `react-vendor` (49KB) — React core
- `query-vendor` (42KB) — TanStack Query
- `chart-vendor` (403KB) — Recharts
- `index` (286KB) — Application code

## Known Limitations

1. Single org-level currency (no multi-currency/exchange rates)
2. Password-only authentication (no OAuth/email)
3. No webhooks (removed from scope)
4. No project-user assignment table (all org members see all projects)
5. No LLM/AI dependency
6. API key scopes are coarse-grained (read/write)

## Cross-Platform Notes

- All file paths use `pathlib.Path` (no backslash dependencies)
- All committed asset filenames are ASCII (`precisiondata-logo.png`, not `精銘數據Logo.png`)
- Docker images use standard base images (`python:3.12-slim`, `node:22-alpine`, `postgres:16-alpine`)
- `.dockerignore` excludes `.venv/`, `node_modules/`, `.git/`, platform-specific binaries
- `package-lock.json` contains platform-specific esbuild/rollup binaries — `npm install` auto-resolves correct platform on Mac/Linux
