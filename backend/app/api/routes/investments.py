from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.client_investment import ClientInvestment
from app.models.user import User
from app.schemas.common import success
from app.schemas.investment import InvestmentCreate, InvestmentOut, InvestmentUpdate
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/client-investments", tags=["investments"])


@router.get("")
async def list_investments(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
    status: str | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(ClientInvestment.project_id == projectId)
    if status:
        filters.append(ClientInvestment.status == status)
    records, total = list_records(db, ClientInvestment, user.organization_id, params, filters)
    return success(
        [InvestmentOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.post("")
async def create_investment(
    body: InvestmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = create_record(db, ClientInvestment, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(InvestmentOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{investment_id}")
async def update_investment(
    investment_id: UUID,
    body: InvestmentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, ClientInvestment, user.organization_id, investment_id)
    data = body.model_dump(exclude_unset=True)
    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(InvestmentOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{investment_id}")
async def delete_investment(
    investment_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, ClientInvestment, user.organization_id, investment_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
