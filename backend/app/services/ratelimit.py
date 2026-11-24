"""Tiny in-memory rate limiter for public endpoints.

Resets on restart/redeploy and is per-process, so it is a deterrent against
abuse (e.g. using the public template form to email-bomb a stranger), not a
hardened defence.
"""
import time
from fastapi import HTTPException

_hits: dict[str, list[float]] = {}
_MAX_KEYS = 5000


def check_rate_limit(key: str, limit: int, window_seconds: int, detail: str = "Too many requests. Please try again later."):
    now = time.time()
    if len(_hits) > _MAX_KEYS:  # keep memory bounded
        for k in [k for k, v in _hits.items() if not v or now - v[-1] > window_seconds]:
            _hits.pop(k, None)
    recent = [t for t in _hits.get(key, []) if now - t < window_seconds]
    if len(recent) >= limit:
        _hits[key] = recent
        raise HTTPException(status_code=429, detail=detail)
    recent.append(now)
    _hits[key] = recent


def reset():
    """Test helper."""
    _hits.clear()
