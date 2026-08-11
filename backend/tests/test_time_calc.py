from decimal import Decimal

from app.domain.time_calc import labor_cost, billable_amount


def test_labor_cost_one_hour():
    assert labor_cost(60, Decimal("100")) == Decimal("100.00")


def test_labor_cost_thirty_minutes():
    assert labor_cost(30, Decimal("100")) == Decimal("50.00")


def test_labor_cost_zero_duration():
    assert labor_cost(0, Decimal("100")) == Decimal("0.00")


def test_billable_amount_one_hour():
    assert billable_amount(60, Decimal("200")) == Decimal("200.00")


def test_billable_amount_non_billable():
    assert billable_amount(60, Decimal("200"), billable=False) == Decimal("0.00")


def test_billable_amount_90_minutes():
    assert billable_amount(90, Decimal("200")) == Decimal("300.00")


def test_snapshots_use_decimal_not_float():
    """Ensure no floating-point arithmetic for money."""
    result = labor_cost(60, Decimal("33.33"))
    assert isinstance(result, Decimal)
    assert result == Decimal("33.33")
