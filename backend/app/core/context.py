"""Request correlation context.

ContextVars propagate a request id across async boundaries (middleware →
handlers → services → loguru records) without threading parameters through
every call site.
"""

from __future__ import annotations

from contextvars import ContextVar
from uuid import uuid4

_request_id: ContextVar[str] = ContextVar("request_id", default="")
_trace_id: ContextVar[str] = ContextVar("trace_id", default="")


def new_request_id() -> str:
    """Generate a compact, URL-safe request identifier."""
    return uuid4().hex[:16]


def set_request_id(request_id: str) -> None:
    _request_id.set(request_id)


def get_request_id() -> str:
    return _request_id.get()


def set_trace_id(trace_id: str) -> None:
    _trace_id.set(trace_id)


def get_trace_id() -> str:
    return _trace_id.get()


def get_correlation() -> dict[str, str]:
    """Correlation fields attached to every structured log record."""
    return {"request_id": _request_id.get(), "trace_id": _trace_id.get()}
