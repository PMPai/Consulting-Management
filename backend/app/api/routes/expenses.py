from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.expense import Expense
from app.models.user import User
from app.schemas.common import success
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/tool-expenses", tags=["expenses"])


@router.get("")
async def list_expenses(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(Expense.project_id == projectId)
    records, total = list_records(db, Expense, user.organization_id, params, filters)
    return success(
        [ExpenseOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.get("/{expense_id}")
async def get_expense(
    expense_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_by_id(db, Expense, user.organization_id, expense_id)
    return success(ExpenseOut.model_validate(record).model_dump(mode="json"))


@router.post("")
async def create_expense(
    body: ExpenseCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = create_record(db, Expense, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(ExpenseOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{expense_id}")
async def update_expense(
    expense_id: UUID,
    body: ExpenseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, Expense, user.organization_id, expense_id)
    data = body.model_dump(exclude_unset=True)
    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(ExpenseOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Expense, user.organization_id, expense_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
