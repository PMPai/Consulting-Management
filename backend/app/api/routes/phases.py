from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.domain.phase_graph import validate_dependencies
from app.models.phase import Phase
from app.models.project import Project
from app.models.user import User
from app.schemas.common import success
from app.schemas.phase import PhaseCreate, PhaseOut, PhaseUpdate
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/phases", tags=["phases"])


@router.get("")
async def list_phases(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
    status: str | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(Phase.project_id == projectId)
    if status:
        filters.append(Phase.status == status)
    records, total = list_records(db, Phase, user.organization_id, params, filters)
    return success(
        [PhaseOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.get("/{phase_id}")
async def get_phase(
    phase_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_by_id(db, Phase, user.organization_id, phase_id)
    return success(PhaseOut.model_validate(record).model_dump(mode="json"))


@router.post("")
async def create_phase(
    body: PhaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    project = db.execute(
        select(Project).where(
            Project.id == body.project_id,
            Project.organization_id == user.organization_id,
            Project.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "INVALID_PROJECT", "message": "Project does not exist"}},
        )

    if body.start_date and project.start_date and body.start_date < project.start_date:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "DATE_OUT_OF_RANGE", "message": "Phase start date is before project start date"}},
        )
    if body.end_date and project.end_date and body.end_date > project.end_date:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "DATE_OUT_OF_RANGE", "message": "Phase end date is after project end date"}},
        )

    record = create_record(db, Phase, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(PhaseOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{phase_id}")
async def update_phase(
    phase_id: UUID,
    body: PhaseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, Phase, user.organization_id, phase_id)
    data = body.model_dump(exclude_unset=True)

    if data.get("predecessor_ids"):
        all_phases = db.execute(
            select(Phase).where(
                Phase.project_id == record.project_id,
                Phase.organization_id == user.organization_id,
                Phase.deleted_at.is_(None),
            )
        ).scalars().all()

        phase_map = {p.id: [pred for pred in (p.predecessor_ids or [])] for p in all_phases}
        phase_map[record.id] = data["predecessor_ids"]

        phase_projects = {p.id: p.project_id for p in all_phases}
        phase_projects[record.id] = record.project_id

        errors = validate_dependencies(
            {pid: preds for pid, preds in phase_map.items()},
            record.project_id,
            phase_projects,
        )
        if errors:
            raise HTTPException(
                status_code=422,
                detail={"error": {"code": "INVALID_DEPENDENCIES", "message": "; ".join(errors)}},
            )

    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(PhaseOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{phase_id}")
async def delete_phase(
    phase_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Phase, user.organization_id, phase_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
