from datetime import datetime, timezone


def elapsed_seconds(
    timer_started_at: datetime,
    accumulated_paused_seconds: int,
    now: datetime | None = None,
    status: str = "running",
) -> int:
    """Server-authoritative elapsed time.

    elapsed = now − started_at − accumulated_paused_seconds (only when running).
    If paused, elapsed = paused_at − started_at − accumulated_paused_seconds.
    """
    if status == "stopped":
        return accumulated_paused_seconds
    if now is None:
        now = datetime.now(timezone.utc)
    delta = int((now - timer_started_at).total_seconds())
    return max(delta - accumulated_paused_seconds, 0)
