import os
import uuid as uuid_lib
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.project_file import ProjectFile
from app.models.user import User
from app.schemas.common import success
from app.schemas.project_file import FileOut
from app.services.crud import get_by_id, list_records, parse_list_params, soft_delete

router = APIRouter(prefix="/project-files", tags=["files"])

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))


def _resolve_storage_path(stored_name: str) -> Path:
    return UPLOAD_DIR / stored_name


def _relative_path(stored_name: str) -> str:
    return f"uploads/{stored_name}"


def _full_path(relative_or_stored: str) -> Path:
    if relative_or_stored.startswith("uploads/") or relative_or_stored.startswith("uploads\\"):
        return UPLOAD_DIR.parent / relative_or_stored
    return UPLOAD_DIR / relative_or_stored


@router.get("")
async def list_files(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(ProjectFile.project_id == projectId)
    records, total = list_records(db, ProjectFile, user.organization_id, params, filters)
    return success(
        [FileOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.post("/upload")
async def upload_file(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    file: UploadFile = File(...),
    projectId: UUID = Form(...),
    phaseId: UUID | None = Form(None),
    description: str | None = Form(None),
    category: str = Form("contract"),
):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_id = uuid_lib.uuid4()
    ext = Path(file.filename or "").suffix
    stored_name = f"{file_id}{ext}"
    storage_path = _resolve_storage_path(stored_name)

    content = await file.read()
    storage_path.write_bytes(content)

    record = ProjectFile(
        id=file_id,
        organization_id=user.organization_id,
        project_id=projectId,
        phase_id=phaseId,
        filename=file.filename or "unnamed",
        file_type=file.content_type,
        file_size=len(content),
        storage_path=_relative_path(stored_name),
        description=description,
        category=category,
        uploaded_by=user.id,
    )
    db.add(record)
    db.flush()
    db.commit()
    return success(FileOut.model_validate(record).model_dump(mode="json"))


@router.get("/{file_id}/download")
async def download_file(
    file_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from fastapi.responses import FileResponse

    record = get_by_id(db, ProjectFile, user.organization_id, file_id)
    full_path = _full_path(record.storage_path)
    if not full_path.exists():
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "File not found on disk"}},
        )
    return FileResponse(
        str(full_path),
        filename=record.filename,
        media_type=record.file_type or "application/octet-stream",
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, ProjectFile, user.organization_id, file_id)
    full_path = _full_path(record.storage_path)
    if full_path.exists():
        full_path.unlink()
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
