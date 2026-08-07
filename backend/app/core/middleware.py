"""Request-context middleware.

- Accepts or generates `X-Request-Id`, propagating it through logs and errors.
- Sets the correlation context for the request's async scope.
- Emits an access-style log line per request.
"""

from __future__ import annotations

import re
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config.constants import REQUEST_ID_HEADER
from app.core.context import new_request_id, set_request_id
from app.core.logging import get_logger

logger = get_logger(__name__)

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assign correlation ids and log request summaries."""

    async def dispatch(self, request: Request, call_next):
        supplied = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = supplied if _REQUEST_ID_PATTERN.fullmatch(supplied) else new_request_id()
        set_request_id(request_id)

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000

        response.headers[REQUEST_ID_HEADER] = request_id
        logger.info(
            "{method} {path} -> {status} ({elapsed:.1f}ms)",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            elapsed=elapsed_ms,
        )
        return response
