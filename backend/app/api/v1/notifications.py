"""Notification endpoints (Phase 3.10)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, get_current_user
from app.core.errors import AppError, ErrorCode
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationPage, NotificationResponse

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])

NotificationId = Annotated[uuid.UUID, Path(description="Notification id")]


def _response(notification: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        body=notification.body,
        read=notification.read,
        run_id=notification.run_id,
        created_at=notification.created_at,
    )


@notifications_router.get("", response_model=NotificationPage, summary="List my notifications")
async def list_notifications(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> NotificationPage:
    conditions = [Notification.owner_id == current_user.id]
    total = await db.scalar(
        select(func.count()).select_from(Notification).where(*conditions)
    )
    result = await db.execute(
        select(Notification)
        .where(*conditions)
        .order_by(
            Notification.read.asc(),
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return NotificationPage(
        items=[_response(item) for item in result.scalars().all()],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@notifications_router.post(
    "/read-all", status_code=204, summary="Mark all my notifications as read"
)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> Response:
    await db.execute(
        update(Notification)
        .where(Notification.owner_id == current_user.id, Notification.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return Response(status_code=204)


@notifications_router.post(
    "/{notification_id}/read", response_model=NotificationResponse, summary="Mark one as read"
)
async def mark_read(
    notification_id: NotificationId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> NotificationResponse:
    notification = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.owner_id == current_user.id
        )
    )
    if notification is None:
        raise AppError(
            code=ErrorCode.NOT_FOUND, message="Notification not found", status_code=404
        )
    if not notification.read:
        notification.read = True
        await db.commit()
        await db.refresh(notification)
    return _response(notification)
