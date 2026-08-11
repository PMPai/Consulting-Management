from datetime import datetime, timezone
from typing import Any, TypeVar
from uuid import UUID

from fastapi import HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class ListParams(BaseModel):
    page: int = 1
    page_size: int = 20
    sort_by: str | None = None
    sort_order: str = "asc"
    q: str | None = None
    include_deleted: bool = False


def parse_list_params(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str | None = Query(None),
    sortOrder: str = Query("asc", pattern="^(asc|desc)$"),
    q: str | None = Query(None),
    includeDeleted: bool = Query(False),
) -> ListParams:
    return ListParams(
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_order=sortOrder,
        q=q,
        include_deleted=includeDeleted,
    )


def get_by_id(
    db: Session,
    model: type[ModelT],
    org_id: UUID,
    record_id: UUID,
    include_deleted: bool = False,
) -> ModelT:
    stmt = select(model).where(
        model.id == record_id,
        model.organization_id == org_id,
    )
    if not include_deleted:
        stmt = stmt.where(model.deleted_at.is_(None))
    record = db.execute(stmt).scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"{model.__tablename__} not found"}},
        )
    return record


def list_records(
    db: Session,
    model: type[ModelT],
    org_id: UUID,
    params: ListParams,
    extra_filters: list | None = None,
) -> tuple[list[ModelT], int]:
    stmt = select(model).where(model.organization_id == org_id)
    if not params.include_deleted:
        stmt = stmt.where(model.deleted_at.is_(None))
    if extra_filters:
        for f in extra_filters:
            stmt = stmt.where(f)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    if params.sort_by and hasattr(model, params.sort_by):
        col = getattr(model, params.sort_by)
        stmt = stmt.order_by(col.desc() if params.sort_order == "desc" else col.asc())
    else:
        stmt = stmt.order_by(model.created_at.desc())

    offset = (params.page - 1) * params.page_size
    stmt = stmt.offset(offset).limit(params.page_size)
    records = db.execute(stmt).scalars().all()
    return list(records), total


def create_record(
    db: Session,
    model: type[ModelT],
    org_id: UUID,
    data: dict[str, Any],
    user_id: UUID | None = None,
) -> ModelT:
    record = model(**data)
    record.organization_id = org_id
    if hasattr(record, "created_by") and user_id:
        record.created_by = user_id
    if hasattr(record, "updated_by") and user_id:
        record.updated_by = user_id
    db.add(record)
    db.flush()
    db.refresh(record)
    return record


def update_record(
    db: Session,
    record: ModelT,
    data: dict[str, Any],
    user_id: UUID | None = None,
    expected_version: int | None = None,
) -> ModelT:
    if expected_version is not None and record.version != expected_version:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "CONFLICT",
                    "message": "Record has been modified by another user. Please reload and try again.",
                    "details": [{"current_version": record.version, "expected_version": expected_version}],
                }
            },
        )

    for key, value in data.items():
        if hasattr(record, key) and value is not None:
            setattr(record, key, value)

    if hasattr(record, "updated_by") and user_id:
        record.updated_by = user_id
    if hasattr(record, "version"):
        record.version += 1

    db.flush()
    db.refresh(record)
    return record


def soft_delete(db: Session, record: ModelT, user_id: UUID | None = None) -> ModelT:
    if hasattr(record, "deleted_at"):
        record.deleted_at = datetime.now(timezone.utc)
    if hasattr(record, "updated_by") and user_id:
        record.updated_by = user_id
    if hasattr(record, "version"):
        record.version += 1
    db.flush()
    return record


def restore(db: Session, record: ModelT, user_id: UUID | None = None) -> ModelT:
    if hasattr(record, "deleted_at"):
        record.deleted_at = None
    if hasattr(record, "updated_by") and user_id:
        record.updated_by = user_id
    if hasattr(record, "version"):
        record.version += 1
    db.flush()
    return record
