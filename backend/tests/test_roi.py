from decimal import Decimal
from uuid import uuid4

from app.domain.roi import compute_roi


def test_roi_basic():
    inv = [{"id": uuid4(), "amount": "10000"}]
    ben = [{"id": uuid4(), "amount": "15000"}]
    r = compute_roi(inv, ben, "p1")
    assert r.roi == Decimal("50.00")
    assert r.net_benefit == Decimal("5000.00")
    assert r.total_investment == Decimal("10000")
    assert r.total_verified_benefit == Decimal("15000")
    assert r.missing_inputs == []


def test_roi_null_when_no_investment():
    ben = [{"id": uuid4(), "amount": "5000"}]
    r = compute_roi([], ben, "p1")
    assert r.roi is None
    assert r.net_benefit is None
    assert "MISSING_CLIENT_INVESTMENT" in r.missing_inputs


def test_roi_null_when_zero_investment():
    inv = [{"id": uuid4(), "amount": "0"}]
    ben = [{"id": uuid4(), "amount": "5000"}]
    r = compute_roi(inv, ben, "p1")
    assert r.roi is None
    assert "MISSING_CLIENT_INVESTMENT" in r.missing_inputs


def test_roi_null_when_no_benefits():
    inv = [{"id": uuid4(), "amount": "10000"}]
    r = compute_roi(inv, [], "p1")
    assert r.roi is None
    assert "NO_VERIFIED_BENEFITS" in r.missing_inputs


def test_roi_negative_benefit():
    inv = [{"id": uuid4(), "amount": "10000"}]
    ben = [{"id": uuid4(), "amount": "3000"}]
    r = compute_roi(inv, ben, "p1")
    assert r.roi == Decimal("-70.00")
    assert r.net_benefit == Decimal("-7000.00")


def test_roi_multiple_records():
    inv = [
        {"id": uuid4(), "amount": "5000"},
        {"id": uuid4(), "amount": "3000"},
    ]
    ben = [
        {"id": uuid4(), "amount": "4000"},
        {"id": uuid4(), "amount": "6000"},
    ]
    r = compute_roi(inv, ben, "p1")
    assert r.total_investment == Decimal("8000")
    assert r.total_verified_benefit == Decimal("10000")
    assert r.roi == Decimal("25.00")
    assert len(r.source_record_ids["investments"]) == 2
    assert len(r.source_record_ids["benefits"]) == 2


def test_roi_never_displays_zero():
    """Missing ROI must never be 0% — it must be null."""
    r = compute_roi([], [], "p1")
    assert r.roi is None
    assert r.roi != Decimal("0")
