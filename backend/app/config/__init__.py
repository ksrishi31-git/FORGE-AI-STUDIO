"""Shared configuration package.

`settings.py` is the single source of truth for every backend process
(API service and workers). See `app/core/README` for layering rules.
"""

from app.config.settings import Settings, get_settings

__all__ = ["Settings", "get_settings"]
