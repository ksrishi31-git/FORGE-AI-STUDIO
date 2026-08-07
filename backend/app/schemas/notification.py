"""Notification API schemas (Phase 3.10)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    read: bool
    run_id: uuid.UUID | None
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
