from decimal import Decimal


def consultant_profit(
    confirmed_revenue: Decimal,
    labor_cost: Decimal,
    consultant_paid_expenses: Decimal,
) -> Decimal:
    """Consultant project profit = confirmed revenue − labor cost − consultant-paid direct expenses."""
    return (confirmed_revenue - labor_cost - consultant_paid_expenses).quantize(Decimal("0.01"))


def consultant_margin(profit: Decimal, confirmed_revenue: Decimal) -> Decimal | None:
    """Consultant margin = profit ÷ confirmed revenue × 100%.
    If confirmed revenue is zero, return None (not 0%)."""
    if confirmed_revenue == 0:
        return None
    return (profit / confirmed_revenue * Decimal(100)).quantize(Decimal("0.01"))
