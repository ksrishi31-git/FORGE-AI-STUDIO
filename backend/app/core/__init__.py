"""Core cross-cutting infrastructure: logging, error handling, request context,
and middleware."""

from app.core.context import get_correlation, get_request_id, new_request_id, set_request_id

__all__ = ["get_correlation", "get_request_id", "new_request_id", "set_request_id"]
