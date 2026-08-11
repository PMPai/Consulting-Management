from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.client import Client
from app.models.project import Project
from app.models.user import User
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate
from app.schemas.common import success
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)
from app.services.crud import (
    restore as restore_record,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
async def list_clients(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    status: str | None = Query(None),
):
    filters = []
    if status:
        filters.append(Client.status == status)
    records, total = list_records(db, Client, user.organization_id, params, filters)
    return success(
        [ClientOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.get("/{client_id}")
async def get_client(
    client_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_by_id(db, Client, user.organization_id, client_id)
    return success(ClientOut.model_validate(record).model_dump(mode="json"))


@router.post("")
async def create_client(
    body: ClientCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    if body.code:
        existing = db.execute(
            select(Client).where(
                Client.organization_id == user.organization_id,
                Client.code == body.code,
                Client.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={"error": {"code": "DUPLICATE_CODE", "message": "Client code already exists in this organization"}},
            )

    record = create_record(db, Client, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(ClientOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{client_id}")
async def update_client(
    client_id: UUID,
    body: ClientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, Client, user.organization_id, client_id)
    data = body.model_dump(exclude_unset=True)
    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(ClientOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{client_id}")
async def delete_client(
    client_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Client, user.organization_id, client_id)

    active_projects = db.execute(
        select(Project).where(
            Project.client_id == client_id,
            Project.deleted_at.is_(None),
        )
    ).scalars().first()
    if active_projects:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "HAS_ACTIVE_PROJECTS", "message": "Cannot delete a client with active projects"}},
        )

    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})


@router.post("/{client_id}/restore")
async def restore_client(
    client_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Client, user.organization_id, client_id, include_deleted=True)
    if not record.deleted_at:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "NOT_DELETED", "message": "Client is not deleted"}},
        )
    restore_record(db, record, user.id)
    db.commit()
    return success(ClientOut.model_validate(record).model_dump(mode="json"))
