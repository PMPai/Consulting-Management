from typing import Any, Generic, TypeVar
from uuid import uuid4

from pydantic import BaseModel

T = TypeVar("T")


class ResponseMeta(BaseModel):
    requestId: str = ""
    page: int | None = None
    pageSize: int | None = None
    total: int | None = None


class ErrorResponseDetail(BaseModel):
    code: str
    message: str
    details: list[Any] = []


class ErrorResponse(BaseModel):
    data: None = None
    meta: ResponseMeta
    error: ErrorResponseDetail


class SuccessResponse(BaseModel, Generic[T]):
    data: T
    meta: ResponseMeta
    error: None = None


def success(data: Any, page: int | None = None, pageSize: int | None = None, total: int | None = None) -> dict[str, Any]:
    return {
        "data": data,
        "meta": {
            "requestId": str(uuid4()),
            "page": page,
            "pageSize": pageSize,
            "total": total,
        },
        "error": None,
    }


def error(code: str, message: str, details: list[Any] | None = None) -> dict[str, Any]:
    return {
        "data": None,
        "meta": {"requestId": str(uuid4())},
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
        },
    }
