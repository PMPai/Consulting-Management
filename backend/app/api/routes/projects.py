from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.client import Client
from app.models.project import Project
from app.models.user import User
from app.schemas.common import success
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
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

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
async def list_projects(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    clientId: UUID | None = Query(None),
    status: str | None = Query(None),
):
    filters = []
    if clientId:
        filters.append(Project.client_id == clientId)
    if status:
        filters.append(Project.status == status)
    records, total = list_records(db, Project, user.organization_id, params, filters)
    return success(
        [ProjectOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_by_id(db, Project, user.organization_id, project_id)
    return success(ProjectOut.model_validate(record).model_dump(mode="json"))


@router.post("")
async def create_project(
    body: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    client = db.execute(
        select(Client).where(
            Client.id == body.client_id,
            Client.organization_id == user.organization_id,
            Client.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "INVALID_CLIENT", "message": "Client does not exist or is deleted"}},
        )

    record = create_record(db, Project, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(ProjectOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{project_id}")
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, Project, user.organization_id, project_id)
    data = body.model_dump(exclude_unset=True)
    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(ProjectOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Project, user.organization_id, project_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})


@router.post("/{project_id}/restore")
async def restore_project(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Project, user.organization_id, project_id, include_deleted=True)
    if not record.deleted_at:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "NOT_DELETED", "message": "Project is not deleted"}},
        )
    restore_record(db, record, user.id)
    db.commit()
    return success(ProjectOut.model_validate(record).model_dump(mode="json"))


@router.post("/{project_id}/archive")
async def archive_project(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Project, user.organization_id, project_id)
    record.archived_at = datetime.now(timezone.utc)
    record.version += 1
    db.flush()
    db.commit()
    return success(ProjectOut.model_validate(record).model_dump(mode="json"))
