from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
from models import User, Report, Media
from schemas import MediaResponse
from auth import get_current_user
from datetime import datetime
from typing import Optional
import os
import uuid

router = APIRouter(prefix="/api/media", tags=["Image & Video Capture"])


@router.post("/upload/{report_id}", response_model=MediaResponse)
async def upload_media(
    report_id: int,
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    capture_time: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        media_type = "image"
        sub_dir = "images"
    elif content_type.startswith("video/"):
        media_type = "video"
        sub_dir = "videos"
    else:
        raise HTTPException(status_code=400, detail="Only image and video files are allowed")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"

    contents = await file.read()

    parsed_time = None
    if capture_time:
        try:
            parsed_time = datetime.fromisoformat(capture_time)
        except ValueError:
            parsed_time = datetime.utcnow()

    # Store file data in database for persistence across deploys
    media = Media(
        report_id=report_id,
        engineer_id=current_user.id,
        media_type=media_type,
        file_path=f"/api/media/file/{unique_name}",
        file_name=file.filename or unique_name,
        latitude=latitude,
        longitude=longitude,
        capture_time=parsed_time or datetime.utcnow(),
        file_size=len(contents),
        file_data=contents,
        content_type=content_type,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return MediaResponse.model_validate(media)


@router.get("/file/{filename}")
def serve_media_file(filename: str, db: Session = Depends(get_db)):
    """Serve media files from database storage."""
    media = db.query(Media).filter(Media.file_path.contains(filename)).first()
    if not media or not media.file_data:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(
        content=media.file_data,
        media_type=media.content_type or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/report/{report_id}", response_model=list[MediaResponse])
def get_report_media(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    media_list = db.query(Media).filter(Media.report_id == report_id).order_by(Media.created_at.desc()).all()
    return [MediaResponse.model_validate(m) for m in media_list]


@router.get("/latest", response_model=list[MediaResponse])
def get_latest_media(
    limit: int = 50,
    zone: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Media).join(Report)
    if zone:
        query = query.filter(Report.zone == zone)
    media_list = query.order_by(Media.created_at.desc()).limit(limit).all()
    return [MediaResponse.model_validate(m) for m in media_list]


@router.delete("/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if current_user.role not in ["admin", "executive_engineer"] and media.engineer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    db.delete(media)
    db.commit()
    return {"message": "Media deleted"}
