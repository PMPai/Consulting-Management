from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.domain.profitability import consultant_margin, consultant_profit
from app.domain.roi import compute_roi
from app.models.benefit_entry import BenefitEntry
from app.models.client_investment import ClientInvestment
from app.models.expense import Expense
from app.models.milestone import Milestone
from app.models.phase import Phase
from app.models.project import Project
from app.models.revenue_entry import RevenueEntry
from app.models.time_entry import TimeEntry
from app.models.user import User
from app.schemas.common import success

router = APIRouter(prefix="/aggregations", tags=["aggregations"])


@router.get("/projects/{project_id}/gantt")
async def get_gantt(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == user.organization_id,
            Project.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Project not found"}})

    phases = db.execute(
        select(Phase).where(
            Phase.project_id == project_id,
            Phase.organization_id == user.organization_id,
            Phase.deleted_at.is_(None),
        ).order_by(Phase.display_order)
    ).scalars().all()

    milestones = db.execute(
        select(Milestone).where(
            Milestone.project_id == project_id,
            Milestone.organization_id == user.organization_id,
            Milestone.deleted_at.is_(None),
        )
    ).scalars().all()

    time_by_phase = {}
    phase_time_rows = db.execute(
        select(
            TimeEntry.phase_id,
            func.sum(TimeEntry.duration_minutes),
            func.sum(TimeEntry.labor_cost),
        ).where(
            TimeEntry.project_id == project_id,
            TimeEntry.organization_id == user.organization_id,
            TimeEntry.deleted_at.is_(None),
        ).group_by(TimeEntry.phase_id)
    ).all()
    for phase_id, total_min, total_cost in phase_time_rows:
        time_by_phase[str(phase_id)] = {
            "actual_minutes": int(total_min or 0),
            "actual_cost": str(total_cost or 0),
        }

    expense_by_phase = {}
    phase_expense_rows = db.execute(
        select(
            Expense.phase_id,
            func.sum(Expense.amount),
        ).where(
            Expense.project_id == project_id,
            Expense.organization_id == user.organization_id,
            Expense.deleted_at.is_(None),
        ).group_by(Expense.phase_id)
    ).all()
    for phase_id, total_exp in phase_expense_rows:
        if phase_id:
            expense_by_phase[str(phase_id)] = str(total_exp or 0)

    return success({
        "project": {
            "id": str(project.id),
            "name": project.name,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "status": project.status,
            "total_quote": str(project.total_quote) if project.total_quote else None,
            "final_goal": project.final_goal,
            "objective": project.objective,
            "notes": project.notes,
        },
        "phases": [
            {
                "id": str(p.id),
                "name": p.name,
                "start_date": p.start_date.isoformat() if p.start_date else None,
                "end_date": p.end_date.isoformat() if p.end_date else None,
                "status": p.status,
                "completion_pct": p.completion_pct,
                "planned_hours": str(p.planned_hours) if p.planned_hours else None,
                "owner_user_id": str(p.owner_user_id) if p.owner_user_id else None,
                "color": p.color,
                "display_order": p.display_order,
                "predecessor_ids": [str(pid) for pid in (p.predecessor_ids or [])],
                "kpi_definition": p.kpi_definition,
                "milestone_goal": p.milestone_goal,
                "estimated_expense": str(p.estimated_expense) if p.estimated_expense else None,
                "actual_time": time_by_phase.get(str(p.id), {"actual_minutes": 0, "actual_cost": "0"}),
                "actual_expense": expense_by_phase.get(str(p.id), "0"),
                "expense_variance": str(
                    Decimal(str(p.estimated_expense or 0)) - Decimal(expense_by_phase.get(str(p.id), "0"))
                ) if p.estimated_expense else None,
            }
            for p in phases
        ],
        "milestones": [
            {
                "id": str(m.id),
                "name": m.name,
                "date": m.date.isoformat() if m.date else None,
                "status": m.status,
                "phase_id": str(m.phase_id) if m.phase_id else None,
            }
            for m in milestones
        ],
    })


@router.get("/projects/{project_id}/roi-summary")
async def get_roi_summary(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    investments = db.execute(
        select(ClientInvestment).where(
            ClientInvestment.project_id == project_id,
            ClientInvestment.organization_id == user.organization_id,
            ClientInvestment.deleted_at.is_(None),
            ClientInvestment.status == "confirmed",
        )
    ).scalars().all()

    benefits = db.execute(
        select(BenefitEntry).where(
            BenefitEntry.project_id == project_id,
            BenefitEntry.organization_id == user.organization_id,
            BenefitEntry.deleted_at.is_(None),
            BenefitEntry.status == "verified",
        )
    ).scalars().all()

    inv_dicts = [{"id": str(i.id), "amount": str(i.amount)} for i in investments]
    ben_dicts = [{"id": str(b.id), "amount": str(b.amount)} for b in benefits]

    result = compute_roi(inv_dicts, ben_dicts, str(project_id))

    return success({
        "roi": str(result.roi) if result.roi is not None else None,
        "net_benefit": str(result.net_benefit) if result.net_benefit is not None else None,
        "total_investment": str(result.total_investment),
        "total_verified_benefit": str(result.total_verified_benefit),
        "missing_inputs": result.missing_inputs,
        "source_record_ids": result.source_record_ids,
        "display_text": "无法计算" if result.roi is None else f"{result.roi}%",
    })


@router.get("/projects/{project_id}/time-summary")
async def get_time_summary(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(
            func.sum(TimeEntry.duration_minutes),
            func.sum(TimeEntry.labor_cost),
            func.sum(TimeEntry.billable_amount),
            func.sum(TimeEntry.duration_minutes).filter(TimeEntry.billable.is_(True)),
        ).where(
            TimeEntry.project_id == project_id,
            TimeEntry.organization_id == user.organization_id,
            TimeEntry.deleted_at.is_(None),
        )
    ).one()

    total_min, total_cost, total_billable, billable_min = rows

    phases = db.execute(
        select(Phase).where(
            Phase.project_id == project_id,
            Phase.organization_id == user.organization_id,
            Phase.deleted_at.is_(None),
        )
    ).scalars().all()

    phase_health = []
    for p in phases:
        actual = db.execute(
            select(func.sum(TimeEntry.duration_minutes)).where(
                TimeEntry.phase_id == p.id,
                TimeEntry.deleted_at.is_(None),
            )
        ).scalar() or 0
        planned_minutes = float(p.planned_hours or 0) * 60
        phase_health.append({
            "phase_id": str(p.id),
            "phase_name": p.name,
            "planned_minutes": planned_minutes,
            "actual_minutes": int(actual),
            "variance_minutes": int(actual) - planned_minutes if planned_minutes else None,
        })

    return success({
        "total_minutes": int(total_min or 0),
        "total_hours": float(total_min or 0) / 60,
        "total_cost": str(total_cost or 0),
        "total_billable_amount": str(total_billable or 0),
        "billable_minutes": int(billable_min or 0),
        "phase_health": phase_health,
    })


@router.get("/projects/{project_id}/financial-summary")
async def get_financial_summary(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total_expenses = db.execute(
        select(func.sum(Expense.amount)).where(
            Expense.project_id == project_id,
            Expense.organization_id == user.organization_id,
            Expense.deleted_at.is_(None),
        )
    ).scalar() or Decimal("0")

    confirmed_revenue = db.execute(
        select(func.sum(RevenueEntry.amount)).where(
            RevenueEntry.project_id == project_id,
            RevenueEntry.organization_id == user.organization_id,
            RevenueEntry.deleted_at.is_(None),
            RevenueEntry.status.in_(["confirmed", "received"]),
        )
    ).scalar() or Decimal("0")

    total_labor_cost = db.execute(
        select(func.sum(TimeEntry.labor_cost)).where(
            TimeEntry.project_id == project_id,
            TimeEntry.organization_id == user.organization_id,
            TimeEntry.deleted_at.is_(None),
        )
    ).scalar() or Decimal("0")

    consultant_paid_expenses = total_expenses
    profit = consultant_profit(confirmed_revenue, total_labor_cost, consultant_paid_expenses)
    margin = consultant_margin(profit, confirmed_revenue)

    project = db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == user.organization_id,
            Project.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    total_quote = Decimal(str(project.total_quote)) if project and project.total_quote else Decimal("0")
    total_cost = total_labor_cost + total_expenses
    quote_profit = total_quote - total_cost if total_quote > 0 else None
    quote_margin = (quote_profit / total_quote * Decimal(100)) if (total_quote > 0 and quote_profit is not None) else None

    return success({
        "confirmed_revenue": str(confirmed_revenue),
        "total_labor_cost": str(total_labor_cost),
        "total_expenses": str(total_expenses),
        "consultant_profit": str(profit),
        "consultant_margin": str(margin) if margin is not None else None,
        "total_quote": str(total_quote) if total_quote > 0 else None,
        "total_cost": str(total_cost),
        "quote_profit": str(quote_profit) if quote_profit is not None else None,
        "quote_margin": str(quote_margin) if quote_margin is not None else None,
    })


@router.get("/dashboard")
async def get_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
):
    if projectId:
        pass
    else:
        projects = db.execute(
            select(Project).where(
                Project.organization_id == user.organization_id,
                Project.deleted_at.is_(None),
            ).order_by(Project.created_at.desc()).limit(1)
        ).scalars().first()
        if projects:
            projectId = projects.id

    if not projectId:
        return success({
            "roi": None,
            "project_completion": 0,
            "consultant_input_cost": "0",
            "verified_benefits": "0",
            "investment_vs_benefit": [],
            "phase_health": [],
            "warnings": ["NO_PROJECTS"],
        })

    investments = db.execute(
        select(ClientInvestment).where(
            ClientInvestment.project_id == projectId,
            ClientInvestment.organization_id == user.organization_id,
            ClientInvestment.deleted_at.is_(None),
            ClientInvestment.status == "confirmed",
        )
    ).scalars().all()

    benefits = db.execute(
        select(BenefitEntry).where(
            BenefitEntry.project_id == projectId,
            BenefitEntry.organization_id == user.organization_id,
            BenefitEntry.deleted_at.is_(None),
            BenefitEntry.status == "verified",
        )
    ).scalars().all()

    inv_dicts = [{"id": str(i.id), "amount": str(i.amount)} for i in investments]
    ben_dicts = [{"id": str(b.id), "amount": str(b.amount)} for b in benefits]
    roi_result = compute_roi(inv_dicts, ben_dicts, str(projectId))

    total_cost = db.execute(
        select(func.sum(TimeEntry.labor_cost)).where(
            TimeEntry.project_id == projectId,
            TimeEntry.organization_id == user.organization_id,
            TimeEntry.deleted_at.is_(None),
        )
    ).scalar() or Decimal("0")

    phases = db.execute(
        select(Phase).where(
            Phase.project_id == projectId,
            Phase.organization_id == user.organization_id,
            Phase.deleted_at.is_(None),
        )
    ).scalars().all()

    avg_completion = (
        sum(p.completion_pct for p in phases) / len(phases) if phases else 0
    )

    inv_by_date = {}
    for inv in investments:
        key = inv.date.isoformat() if inv.date else "unknown"
        inv_by_date[key] = inv_by_date.get(key, Decimal("0")) + inv.amount

    ben_by_date = {}
    for ben in benefits:
        key = ben.observation_date.isoformat() if ben.observation_date else "unknown"
        ben_by_date[key] = ben_by_date.get(key, Decimal("0")) + ben.amount

    all_dates = sorted(set(list(inv_by_date.keys()) + list(ben_by_date.keys())))
    chart_data = [
        {
            "date": d,
            "investment": str(inv_by_date.get(d, Decimal("0"))),
            "benefit": str(ben_by_date.get(d, Decimal("0"))),
        }
        for d in all_dates
    ]

    warnings = []
    if not investments:
        warnings.append("MISSING_CLIENT_INVESTMENT")
    if not benefits:
        warnings.append("NO_VERIFIED_BENEFITS")

    return success({
        "roi": str(roi_result.roi) if roi_result.roi is not None else None,
        "roi_display": "无法计算" if roi_result.roi is None else f"{roi_result.roi}%",
        "project_completion": round(avg_completion, 1),
        "consultant_input_cost": str(total_cost),
        "verified_benefits": str(roi_result.total_verified_benefit),
        "investment_vs_benefit": chart_data,
        "phase_count": len(phases),
        "warnings": warnings,
    })
