from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Report, Media
from schemas import ReportCreate, ReportResponse
from auth import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/reports", tags=["Data Entry"])


@router.post("/", response_model=ReportResponse)
def create_report(report_data: ReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = Report(
        engineer_id=current_user.id,
        property_address=report_data.property_address,
        zone=report_data.zone or current_user.zone,
        ward=report_data.ward,
        visit_date=report_data.visit_date,
        activity_type=report_data.activity_type,
        activity_description=report_data.activity_description,
        owner_name=report_data.owner_name,
        owner_contact=report_data.owner_contact,
        ownership_type=report_data.ownership_type,
        last_sanctioned_plan=report_data.last_sanctioned_plan,
        sanctioned_plan_date=report_data.sanctioned_plan_date,
        latitude=report_data.latitude,
        longitude=report_data.longitude,
        remarks=report_data.remarks
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    media_count = db.query(func.count(Media.id)).filter(Media.report_id == report.id).scalar()
    return ReportResponse(
        **{c.name: getattr(report, c.name) for c in report.__table__.columns},
        engineer_name=current_user.full_name,
        engineer_role=current_user.role,
        media_count=media_count
    )


@router.get("/", response_model=list[ReportResponse])
def list_reports(
    zone: Optional[str] = None,
    activity_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Report)

    if current_user.role != "admin":
        if current_user.role == "assistant_engineer":
            query = query.filter(Report.engineer_id == current_user.id)
        elif current_user.role == "junior_engineer":
            query = query.filter(Report.zone == current_user.zone)

    if zone:
        query = query.filter(Report.zone == zone)
    if activity_type:
        query = query.filter(Report.activity_type == activity_type)
    if status:
        query = query.filter(Report.status == status)
    if date_from:
        query = query.filter(Report.visit_date >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Report.visit_date <= datetime.fromisoformat(date_to))

    query = query.order_by(Report.created_at.desc())
    reports = query.offset((page - 1) * per_page).limit(per_page).all()

    results = []
    for report in reports:
        engineer = db.query(User).filter(User.id == report.engineer_id).first()
        media_count = db.query(func.count(Media.id)).filter(Media.report_id == report.id).scalar()
        results.append(ReportResponse(
            **{c.name: getattr(report, c.name) for c in report.__table__.columns},
            engineer_name=engineer.full_name if engineer else None,
            engineer_role=engineer.role if engineer else None,
            media_count=media_count
        ))
    return results


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    engineer = db.query(User).filter(User.id == report.engineer_id).first()
    media_count = db.query(func.count(Media.id)).filter(Media.report_id == report.id).scalar()
    return ReportResponse(
        **{c.name: getattr(report, c.name) for c in report.__table__.columns},
        engineer_name=engineer.full_name if engineer else None,
        engineer_role=engineer.role if engineer else None,
        media_count=media_count
    )


@router.put("/{report_id}/status")
def update_report_status(
    report_id: int,
    new_status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "executive_engineer"]:
        raise HTTPException(status_code=403, detail="Only admin or executive engineers can update status")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = new_status
    report.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Status updated", "new_status": new_status}


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can delete reports")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete associated media files and records
    import os
    media_list = db.query(Media).filter(Media.report_id == report_id).all()
    DATA_DIR = "/data" if os.path.isdir("/data") else os.path.dirname(os.path.dirname(__file__))
    for media in media_list:
        full_path = os.path.join(DATA_DIR, media.file_path.lstrip("/"))
        if os.path.exists(full_path):
            os.remove(full_path)
        db.delete(media)

    db.delete(report)
    db.commit()
    return {"message": "Report and associated media deleted"}
