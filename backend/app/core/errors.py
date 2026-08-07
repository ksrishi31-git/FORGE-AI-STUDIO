"""Centralized error handling (BAD §12).

Every error leaves the service as the standard envelope:

    {"error": {"code", "message", "details?", "request_id", "path", "ts"}}

Handlers cover domain errors (AppError), validation errors, HTTP errors, and
unhandled exceptions. 500 responses never leak internals.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.constants import REQUEST_ID_HEADER
from app.core.context import get_request_id
from app.core.logging import get_logger

logger = get_logger(__name__)

_HTTP_STATUS_TO_CODE: dict[int, str] = {
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    429: "RATE_LIMITED",
    502: "UPSTREAM_ERROR",
    503: "PROVIDER_UNAVAILABLE",
}


class ErrorCode(StrEnum):
    """Canonical error codes shared with the frontend API layer."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    RATE_LIMITED = "RATE_LIMITED"
    UPSTREAM_ERROR = "UPSTREAM_ERROR"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    HTTP_ERROR = "HTTP_ERROR"
    AGENT_FAILED = "AGENT_FAILED"
    GATE_BLOCKED = "GATE_BLOCKED"
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED"
    INVALID_RESET_TOKEN = "INVALID_RESET_TOKEN"


class AppError(Exception):
    """Domain exception carrying an explicit HTTP status and error code."""

    def __init__(
        self,
        *,
        code: ErrorCode | str,
        message: str,
        status_code: int = 400,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = str(code)
        self.message = message
        self.status_code = status_code
        self.details = details


def build_error_envelope(
    *,
    code: str,
    message: str,
    path: str,
    request_id: str,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": request_id,
        "path": path,
        "ts": datetime.now(UTC).isoformat(),
    }
    if details:
        error["details"] = details
    return {"error": error}


def _json_response(status_code: int, payload: dict[str, Any], request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=payload,
        headers={REQUEST_ID_HEADER: request_id},
    )


def _request_id(request: Request) -> str:
    return get_request_id() or request.headers.get(REQUEST_ID_HEADER, "")


async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = _request_id(request)
    logger.warning(
        "Domain error {code} on {method} {path}",
        code=exc.code,
        method=request.method,
        path=request.url.path,
    )
    payload = build_error_envelope(
        code=exc.code,
        message=exc.message,
        path=request.url.path,
        request_id=request_id,
        details=exc.details,
    )
    return _json_response(exc.status_code, payload, request_id)


async def _validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = _request_id(request)
    details = [
        {
            "field": ".".join(
                str(part) for part in error.get("loc", []) if part not in ("body", "query", "path")
            ),
            "reason": str(error.get("type", error.get("msg", "invalid"))),
        }
        for error in exc.errors()
    ]
    payload = build_error_envelope(
        code=ErrorCode.VALIDATION_ERROR.value,
        message="Request validation failed",
        path=request.url.path,
        request_id=request_id,
        details=details,
    )
    return _json_response(422, payload, request_id)


async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = _request_id(request)
    code = _HTTP_STATUS_TO_CODE.get(exc.status_code, ErrorCode.HTTP_ERROR.value)
    payload = build_error_envelope(
        code=code, message=str(exc.detail), path=request.url.path, request_id=request_id
    )
    return _json_response(exc.status_code, payload, request_id)


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id(request)
    logger.exception(
        "Unhandled error on {method} {path}", method=request.method, path=request.url.path
    )
    payload = build_error_envelope(
        code=ErrorCode.INTERNAL_ERROR.value,
        message="An internal error occurred",
        path=request.url.path,
        request_id=request_id,
    )
    return _json_response(500, payload, request_id)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
