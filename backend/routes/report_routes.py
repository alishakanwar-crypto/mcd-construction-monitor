from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from database import get_db
from models import User, Report, Media
from schemas import DailySummary, ZoneSummary
from auth import get_current_user, require_role
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/api/reports-summary", tags=["Reports & Summary"])


@router.get("/daily", response_model=ZoneSummary)
def get_daily_summary(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if date:
        target_date = datetime.fromisoformat(date).date()
    else:
        target_date = datetime.utcnow().date()

    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())

    zones = db.query(Report.zone).filter(
        Report.visit_date >= start,
        Report.visit_date <= end
    ).distinct().all()

    zone_summaries = []
    grand_total = 0

    for (zone_name,) in zones:
        zone_reports = db.query(Report).filter(
            Report.zone == zone_name,
            Report.visit_date >= start,
            Report.visit_date <= end
        ).all()

        report_ids = [r.id for r in zone_reports]
        media_count = db.query(func.count(Media.id)).filter(
            Media.report_id.in_(report_ids)
        ).scalar() if report_ids else 0

        engineer_ids = set(r.engineer_id for r in zone_reports)

        activity_breakdown = {}
        for r in zone_reports:
            activity_breakdown[r.activity_type] = activity_breakdown.get(r.activity_type, 0) + 1

        total = len(zone_reports)
        grand_total += total

        zone_summaries.append(DailySummary(
            zone=zone_name,
            total_reports=total,
            activity_breakdown=activity_breakdown,
            engineer_count=len(engineer_ids),
            media_count=media_count,
            date=str(target_date)
        ))

    zone_summaries.sort(key=lambda x: x.total_reports, reverse=True)

    return ZoneSummary(
        date=str(target_date),
        zones=zone_summaries,
        grand_total=grand_total
    )


@router.get("/zone/{zone_name}")
def get_zone_report(
    zone_name: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Report).filter(Report.zone == zone_name)

    if date_from:
        query = query.filter(Report.visit_date >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Report.visit_date <= datetime.fromisoformat(date_to))

    reports = query.order_by(Report.visit_date.desc()).all()

    activity_summary = {}
    status_summary = {}
    for r in reports:
        activity_summary[r.activity_type] = activity_summary.get(r.activity_type, 0) + 1
        status_summary[r.status] = status_summary.get(r.status, 0) + 1

    return {
        "zone": zone_name,
        "total_reports": len(reports),
        "activity_summary": activity_summary,
        "status_summary": status_summary,
        "reports": [
            {
                "id": r.id,
                "property_address": r.property_address,
                "visit_date": r.visit_date.isoformat(),
                "activity_type": r.activity_type,
                "status": r.status,
                "owner_name": r.owner_name,
            }
            for r in reports
        ]
    }


@router.get("/stats")
def get_overall_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_reports = db.query(func.count(Report.id)).scalar()
    total_media = db.query(func.count(Media.id)).scalar()
    total_engineers = db.query(func.count(User.id)).filter(User.role != "admin").scalar()
    total_zones = db.query(func.count(func.distinct(Report.zone))).scalar()

    today = datetime.utcnow().date()
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time())
    today_reports = db.query(func.count(Report.id)).filter(
        Report.visit_date >= start, Report.visit_date <= end
    ).scalar()

    pending = db.query(func.count(Report.id)).filter(Report.status == "pending").scalar()
    reviewed = db.query(func.count(Report.id)).filter(Report.status == "reviewed").scalar()
    action_taken = db.query(func.count(Report.id)).filter(Report.status == "action_taken").scalar()

    return {
        "total_reports": total_reports,
        "total_media": total_media,
        "total_engineers": total_engineers,
        "total_zones": total_zones,
        "today_reports": today_reports,
        "status_breakdown": {
            "pending": pending,
            "reviewed": reviewed,
            "action_taken": action_taken
        }
    }
