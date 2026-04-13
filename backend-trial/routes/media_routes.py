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
import math
import httpx

router = APIRouter(prefix="/api/media", tags=["Image & Video Capture"])

# All 12 official MCD zones with approximate center GPS coordinates
MCD_ZONES = [
    {"name": "Central Zone", "lat": 28.6354, "lng": 77.2330},
    {"name": "City-SP Zone", "lat": 28.6425, "lng": 77.2100},
    {"name": "Civil Lines", "lat": 28.6862, "lng": 77.2263},
    {"name": "Karol Bagh", "lat": 28.6514, "lng": 77.1905},
    {"name": "Keshav Puram", "lat": 28.6808, "lng": 77.1569},
    {"name": "Najafgarh Zone", "lat": 28.5709, "lng": 77.0685},
    {"name": "Narela", "lat": 28.8460, "lng": 77.0970},
    {"name": "North Shahdara Zone", "lat": 28.6961, "lng": 77.2907},
    {"name": "Rohini", "lat": 28.7330, "lng": 77.1155},
    {"name": "South Shahdara Zone", "lat": 28.6363, "lng": 77.2877},
    {"name": "South Zone", "lat": 28.5244, "lng": 77.2188},
    {"name": "West Zone", "lat": 28.6251, "lng": 77.1025},
]

# Distance threshold in meters for grouping images into same report
SAME_LOCATION_THRESHOLD_M = 200


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS points in meters."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def detect_zone(lat: float, lng: float) -> str:
    """Detect MCD zone from GPS coordinates using nearest center."""
    min_dist = float("inf")
    nearest_zone = "Central Zone"
    for z in MCD_ZONES:
        d = haversine_distance(lat, lng, z["lat"], z["lng"])
        if d < min_dist:
            min_dist = d
            nearest_zone = z["name"]
    return nearest_zone


async def reverse_geocode(lat: float, lng: float) -> str:
    """Get address from GPS coordinates using OpenStreetMap Nominatim."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "addressdetails": 1},
                headers={"User-Agent": "MCD-Construction-Monitor/1.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("display_name", f"{lat:.6f}, {lng:.6f}")
    except Exception:
        pass
    return f"{lat:.6f}, {lng:.6f}"


def find_nearby_report(db: Session, lat: float, lng: float, engineer_id: int) -> Optional[Report]:
    """Find an existing report within SAME_LOCATION_THRESHOLD_M meters."""
    # Only check reports from last 24 hours by same engineer
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    reports = (
        db.query(Report)
        .filter(
            Report.engineer_id == engineer_id,
            Report.latitude.isnot(None),
            Report.longitude.isnot(None),
            Report.created_at >= cutoff,
        )
        .all()
    )
    for r in reports:
        if r.latitude and r.longitude:
            dist = haversine_distance(lat, lng, r.latitude, r.longitude)
            if dist <= SAME_LOCATION_THRESHOLD_M:
                return r
    return None


@router.post("/quick-capture")
async def quick_capture(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    capture_time: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Quick capture: upload image/video, auto-create or attach to existing report.
    - Detects MCD zone from GPS
    - Gets address via reverse geocoding
    - Groups images from same location into one report
    - Defaults activity_type to 'unauthorized_construction'
    """
    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        media_type = "image"
    elif content_type.startswith("video/"):
        media_type = "video"
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

    lat = latitude
    lng = longitude

    # Detect zone and address from GPS
    zone = "Central Zone"
    address = "Address pending"
    if lat and lng:
        zone = detect_zone(lat, lng)
        address = await reverse_geocode(lat, lng)

    # Check if there's an existing report nearby (same location = same report)
    existing_report = None
    if lat and lng:
        existing_report = find_nearby_report(db, lat, lng, current_user.id)

    report_created = False
    if existing_report:
        report = existing_report
    else:
        # Auto-create a new report
        report = Report(
            engineer_id=current_user.id,
            property_address=address,
            zone=zone,
            ward="",
            visit_date=parsed_time or datetime.utcnow(),
            activity_type="unauthorized_construction",
            activity_description="",
            owner_name="",
            owner_contact="",
            ownership_type="",
            last_sanctioned_plan="",
            latitude=lat,
            longitude=lng,
            status="pending",
            remarks="Auto-created from quick capture",
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        report_created = True

    # Save media to database
    media = Media(
        report_id=report.id,
        engineer_id=current_user.id,
        media_type=media_type,
        file_path=f"/api/media/file/{unique_name}",
        file_name=file.filename or unique_name,
        latitude=lat,
        longitude=lng,
        capture_time=parsed_time or datetime.utcnow(),
        file_size=len(contents),
        file_data=contents,
        content_type=content_type,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # Count total media for this report
    media_count = db.query(Media).filter(Media.report_id == report.id).count()

    return {
        "report_id": report.id,
        "report_created": report_created,
        "report": {
            "id": report.id,
            "property_address": report.property_address,
            "zone": report.zone,
            "ward": report.ward or "",
            "visit_date": report.visit_date.isoformat() if report.visit_date else None,
            "activity_type": report.activity_type,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "status": report.status,
            "media_count": media_count,
        },
        "media": {
            "id": media.id,
            "file_path": media.file_path,
            "file_name": media.file_name,
            "media_type": media.media_type,
            "latitude": media.latitude,
            "longitude": media.longitude,
            "capture_time": media.capture_time.isoformat() if media.capture_time else None,
        },
    }


@router.get("/zones")
def get_mcd_zones():
    """Return all MCD zones for the frontend."""
    return [z["name"] for z in MCD_ZONES]


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
    elif content_type.startswith("video/"):
        media_type = "video"
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
