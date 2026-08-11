from decimal import Decimal

from app.domain.profitability import consultant_profit, consultant_margin


def test_profit_basic():
    profit = consultant_profit(Decimal("10000"), Decimal("3000"), Decimal("500"))
    assert profit == Decimal("6500.00")


def test_margin_basic():
    profit = Decimal("6500")
    margin = consultant_margin(profit, Decimal("10000"))
    assert margin == Decimal("65.00")


def test_margin_null_when_zero_revenue():
    """If confirmed revenue is zero, margin must be None, not 0%."""
    margin = consultant_margin(Decimal("0"), Decimal("0"))
    assert margin is None


def test_margin_negative_profit():
    profit = Decimal("-2000")
    margin = consultant_margin(profit, Decimal("10000"))
    assert margin == Decimal("-20.00")
