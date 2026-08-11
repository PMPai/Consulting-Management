from datetime import datetime, timezone
from uuid import UUID

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.database import SessionLocal
from app.models.audit_log import AuditLog

SENSITIVE_FIELDS = {
    "password", "password_hash", "token", "secret", "secret_hmac",
    "hashed_key", "api_key", "webhook_secret",
}


def redact_sensitive(data: dict) -> dict:
    """Remove sensitive values from audit log summaries."""
    if not isinstance(data, dict):
        return data
    return {k: "[REDACTED]" if k.lower() in SENSITIVE_FIELDS else v for k, v in data.items()}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in ("POST", "PATCH", "DELETE"):
            return await call_next(request)

        org_id = getattr(request.state, "organization_id", None)
        user = getattr(request.state, "current_user", None)
        request_id = getattr(request.state, "request_id", None)

        response = await call_next(request)

        if org_id and response.status_code < 500:
            try:
                resource_type = self._extract_resource(request.url.path)
                operation = self._method_to_operation(request.method)

                db = SessionLocal()
                try:
                    log = AuditLog(
                        organization_id=org_id,
                        request_id=request_id,
                        actor_id=user.id if user else None,
                        actor_type="user" if user else "system",
                        source="web" if user else "system",
                        timestamp=datetime.now(timezone.utc),
                        resource_type=resource_type,
                        resource_id=self._extract_id(request.url.path),
                        operation=operation,
                        before_summary=None,
                        after_summary=None,
                        failure_status=None if response.status_code < 400 else f"HTTP_{response.status_code}",
                    )
                    db.add(log)
                    db.commit()
                finally:
                    db.close()
            except Exception:
                pass

        return response

    def _extract_resource(self, path: str) -> str:
        parts = [p for p in path.replace("/api/v1/", "").split("/") if p]
        if parts:
            resource = parts[0]
            if resource == "auth":
                return "auth"
            return resource
        return "unknown"

    def _extract_id(self, path: str) -> str | None:
        parts = [p for p in path.replace("/api/v1/", "").split("/") if p]
        if len(parts) >= 2:
            try:
                UUID(parts[1])
                return parts[1]
            except (ValueError, TypeError):
                return None
        return None

    def _method_to_operation(self, method: str) -> str:
        return {
            "POST": "create",
            "PATCH": "update",
            "DELETE": "delete",
        }.get(method, "unknown")
