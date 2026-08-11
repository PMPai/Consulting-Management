import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes.aggregations import router as aggregations_router
from app.api.routes.api_keys import router as api_keys_router
from app.api.routes.audit_logs import router as audit_logs_router
from app.api.routes.auth import router as auth_router
from app.api.routes.benefits import router as benefits_router
from app.api.routes.clients import router as clients_router
from app.api.routes.expenses import router as expenses_router
from app.api.routes.investments import router as investments_router
from app.api.routes.milestones import router as milestones_router
from app.api.routes.phases import router as phases_router
from app.api.routes.project_files import router as project_files_router
from app.api.routes.projects import router as projects_router
from app.api.routes.revenue import router as revenue_router
from app.api.routes.role_rates import router as role_rates_router
from app.api.routes.time_entries import router as time_entries_router
from app.config import settings
from app.middleware.audit import AuditMiddleware

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="顾问项目 ROI 管理台",
    description="PrecisionData consulting project management API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "data": None,
            "meta": {"requestId": getattr(request.state, "request_id", str(uuid4()))},
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "data": None,
            "meta": {"requestId": getattr(request.state, "request_id", str(uuid4()))},
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": [],
            },
        },
    )


app.include_router(auth_router, prefix="/api/v1")
app.include_router(clients_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(phases_router, prefix="/api/v1")
app.include_router(milestones_router, prefix="/api/v1")
app.include_router(time_entries_router, prefix="/api/v1")
app.include_router(expenses_router, prefix="/api/v1")
app.include_router(revenue_router, prefix="/api/v1")
app.include_router(investments_router, prefix="/api/v1")
app.include_router(benefits_router, prefix="/api/v1")
app.include_router(aggregations_router, prefix="/api/v1")
app.include_router(api_keys_router, prefix="/api/v1")
app.include_router(audit_logs_router, prefix="/api/v1")
app.include_router(project_files_router, prefix="/api/v1")
app.include_router(role_rates_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/readiness")
async def readiness():
    return {"status": "ready"}
