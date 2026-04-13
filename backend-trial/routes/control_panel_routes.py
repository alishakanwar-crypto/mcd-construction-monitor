from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Report, Media
from auth import get_current_user, require_role
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/control-panel", tags=["Control Panel"])


@router.get("/live-feed")
def get_live_feed(
    zone: Optional[str] = None,
    media_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Media, Report, User).join(
        Report, Media.report_id == Report.id
    ).join(
        User, Media.engineer_id == User.id
    )

    if zone:
        query = query.filter(Report.zone == zone)
    if media_type:
        query = query.filter(Media.media_type == media_type)

    results = query.order_by(Media.created_at.desc()).limit(limit).all()

    feed = []
    for media, report, engineer in results:
        feed.append({
            "id": media.id,
            "media_type": media.media_type,
            "file_path": media.file_path,
            "file_name": media.file_name,
            "latitude": media.latitude,
            "longitude": media.longitude,
            "capture_time": media.capture_time.isoformat() if media.capture_time else None,
            "created_at": media.created_at.isoformat(),
            "report_id": report.id,
            "property_address": report.property_address,
            "zone": report.zone,
            "activity_type": report.activity_type,
            "engineer_name": engineer.full_name,
            "engineer_role": engineer.role,
        })

    return {"feed": feed, "total": len(feed)}


@router.get("/zones")
def get_zones(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zones = db.query(Report.zone, func.count(Report.id)).group_by(Report.zone).all()
    return [{"zone": z, "report_count": c} for z, c in zones]


@router.get("/activity-types")
def get_activity_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    types = db.query(Report.activity_type, func.count(Report.id)).group_by(Report.activity_type).all()
    return [{"type": t, "count": c} for t, c in types]
