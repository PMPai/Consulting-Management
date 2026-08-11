from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class ROIBreakdown:
    roi: Decimal | None
    net_benefit: Decimal | None
    total_investment: Decimal
    total_verified_benefit: Decimal
    missing_inputs: list[str]
    source_record_ids: dict[str, list[str]]


def compute_roi(
    confirmed_investments: list[dict[str, Any]],
    verified_benefits: list[dict[str, Any]],
    project_id: str,
) -> ROIBreakdown:
    """Project-lifetime ROI (ignores date selector).

    Official verified benefit = verified benefits only.
    Client investment = confirmed investments only.
    Client net benefit = verified benefit − client investment.
    Client ROI = net benefit ÷ investment × 100%.
    """
    total_investment = sum(
        (Decimal(str(inv["amount"])) for inv in confirmed_investments),
        Decimal("0"),
    )
    total_verified_benefit = sum(
        (Decimal(str(ben["amount"])) for ben in verified_benefits),
        Decimal("0"),
    )

    missing_inputs: list[str] = []
    investment_ids = [str(inv["id"]) for inv in confirmed_investments]
    benefit_ids = [str(ben["id"]) for ben in verified_benefits]

    if total_investment <= 0:
        missing_inputs.append("MISSING_CLIENT_INVESTMENT")

    if not verified_benefits:
        missing_inputs.append("NO_VERIFIED_BENEFITS")

    if missing_inputs:
        return ROIBreakdown(
            roi=None,
            net_benefit=None,
            total_investment=total_investment,
            total_verified_benefit=total_verified_benefit,
            missing_inputs=missing_inputs,
            source_record_ids={
                "investments": investment_ids,
                "benefits": benefit_ids,
            },
        )

    net_benefit = total_verified_benefit - total_investment
    roi = (net_benefit / total_investment * Decimal(100)).quantize(Decimal("0.01"))

    return ROIBreakdown(
        roi=roi,
        net_benefit=net_benefit,
        total_investment=total_investment,
        total_verified_benefit=total_verified_benefit,
        missing_inputs=[],
        source_record_ids={
            "investments": investment_ids,
            "benefits": benefit_ids,
        },
    )
