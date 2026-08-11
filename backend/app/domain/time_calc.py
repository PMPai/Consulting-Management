from decimal import Decimal


def labor_cost(duration_minutes: int, internal_cost_rate_snapshot: Decimal) -> Decimal:
    """Labor cost = duration in hours × saved internal cost-rate snapshot."""
    hours = Decimal(duration_minutes) / Decimal(60)
    return (hours * internal_cost_rate_snapshot).quantize(Decimal("0.01"))


def billable_amount(
    duration_minutes: int,
    client_billing_rate_snapshot: Decimal,
    billable: bool = True,
) -> Decimal:
    """Billable amount = billable duration in hours × saved billing-rate snapshot."""
    if not billable:
        return Decimal("0.00")
    hours = Decimal(duration_minutes) / Decimal(60)
    return (hours * client_billing_rate_snapshot).quantize(Decimal("0.01"))
