from datetime import datetime, timedelta, timezone

from app.domain.timer import elapsed_seconds


def test_elapsed_running():
    start = datetime.now(timezone.utc) - timedelta(seconds=100)
    elapsed = elapsed_seconds(start, 0, datetime.now(timezone.utc))
    assert 99 <= elapsed <= 101


def test_elapsed_with_paused_time():
    start = datetime.now(timezone.utc) - timedelta(seconds=100)
    elapsed = elapsed_seconds(start, 30, datetime.now(timezone.utc))
    assert 69 <= elapsed <= 71


def test_elapsed_stopped():
    elapsed = elapsed_seconds(
        datetime.now(timezone.utc), 300, datetime.now(timezone.utc), status="stopped"
    )
    assert elapsed == 300


def test_elapsed_never_negative():
    start = datetime.now(timezone.utc) - timedelta(seconds=10)
    elapsed = elapsed_seconds(start, 100, datetime.now(timezone.utc))
    assert elapsed >= 0
