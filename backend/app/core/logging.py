"""Production logging configuration (loguru).

- Structured, single-line records with correlation fields (BAD §11).
- Intercepts the standard-library logging used by uvicorn and libraries.
- Redacts credentials and bearer tokens before any record is emitted.
- Optional JSON output and rotating file sinks, driven by settings.
"""

from __future__ import annotations

import json
import logging
import re
import sys
import traceback
from datetime import UTC, datetime
from typing import Any

from loguru import logger as _logger

from app.config.constants import SERVICE_SLUG
from app.core.context import get_correlation

_SECRET_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(?i)\b(bearer\s+)[a-z0-9._\-]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)\b(sk-[a-z0-9]{8})[a-z0-9\-_]*"), r"\1[REDACTED]"),
    (re.compile(r"(?i)(password|secret|token|api[_-]?key)\s*[=:]\s*\S+"), r"\1=[REDACTED]"),
    (re.compile(r"(?i)postgresql(\+asyncpg)?://[^@]+@"), r"postgresql\1://[REDACTED]@"),
)


def _sanitize(message: str) -> str:
    for pattern, replacement in _SECRET_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


class _InterceptHandler(logging.Handler):
    """Route standard-library log records into loguru."""

    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover - trivial bridge
        try:
            level: int | str = _logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame = logging.currentframe()
        depth = 2
        while frame is not None and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        _logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def _text_formatter(record: dict[str, Any]) -> str:
    correlation = get_correlation()
    record["extra"]["service"] = SERVICE_SLUG
    record["extra"]["request_id"] = correlation["request_id"]
    record["extra"]["trace_id"] = correlation["trace_id"]
    record["message"] = _sanitize(str(record.get("message", "")))
    template = (
        "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {extra[service]} | "
        "{extra[request_id]: >16} | {name}:{function}:{line} | {message}\n"
    )
    if record.get("exception"):
        # Loguru renders the full traceback for this record.
        template += "{exception}\n"
    return template


def _json_formatter(record: dict[str, Any]) -> str:
    correlation = get_correlation()
    payload = {
        "ts": datetime.now(UTC).isoformat(),
        "level": record["level"].name,
        "service": SERVICE_SLUG,
        "request_id": correlation["request_id"],
        "trace_id": correlation["trace_id"],
        "logger": record["name"],
        "message": _sanitize(str(record.get("message", ""))),
    }
    if record.get("exception") is not None:
        payload["exception"] = "".join(traceback.format_exception(*record["exception"]))
    return json.dumps(payload, default=str) + "\n"


def configure_logging(
    *, level: str = "INFO", fmt: str = "text", log_file: str | None = None
) -> None:
    """Idempotently configure loguru sinks and stdlib interception."""
    _logger.remove()
    formatter = _json_formatter if fmt == "json" else _text_formatter
    _logger.add(
        sys.stdout,
        level=level,
        format=formatter,
        colorize=False,
        backtrace=False,
        diagnose=False,
    )

    if log_file:
        _logger.add(
            log_file,
            level=level,
            format=formatter,
            rotation="10 MB",
            retention=7,
            encoding="utf-8",
            enqueue=True,
        )

    logging.basicConfig(handlers=[_InterceptHandler()], level=0, force=True)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).handlers = [_InterceptHandler()]


def get_logger(name: str):
    """Return a loguru logger bound to a module name."""
    return _logger.bind(module=name)
