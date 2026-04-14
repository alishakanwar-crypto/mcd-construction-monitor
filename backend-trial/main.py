from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from database import engine, Base, SessionLocal
from models import User, Report, Media
from auth import get_password_hash
from routes.auth_routes import router as auth_router
from routes.data_entry_routes import router as data_entry_router
from routes.media_routes import router as media_router, generate_thumbnail
from routes.report_routes import router as report_router
from routes.control_panel_routes import router as control_panel_router
from routes.image_extract_routes import router as image_extract_router
import os
import uuid
import io
from datetime import datetime, timedelta
from PIL import Image as PILImage, ImageDraw, ImageFont

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Add any new columns that create_all won't add to existing tables."""
    insp = inspect(engine)
    if "media" in insp.get_table_names():
        columns = [c["name"] for c in insp.get_columns("media")]
        if "thumbnail_data" not in columns:
            with engine.begin() as conn:
                dialect = engine.dialect.name
                if dialect == "postgresql":
                    conn.execute(text("ALTER TABLE media ADD COLUMN thumbnail_data BYTEA"))
                else:
                    conn.execute(text("ALTER TABLE media ADD COLUMN thumbnail_data BLOB"))


_run_migrations()

app = FastAPI(
    title="MCD Unauthorized Construction Monitor",
    description="Software to monitor unauthorized construction activities across MCD zones",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Media files are now served from PostgreSQL database via /api/media/file/{filename}
# No filesystem mount needed - this ensures data persists across deploys

# Include routers
app.include_router(auth_router)
app.include_router(data_entry_router)
app.include_router(media_router)
app.include_router(report_router)
app.include_router(control_panel_router)
app.include_router(image_extract_router)


@app.on_event("startup")
def seed_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                full_name="System Administrator",
                email="admin@mcd.gov.in",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                zone="HQ"
            )
            db.add(admin)

            # Seed demo engineers
            demo_engineers = [
                {"username": "ae_north", "full_name": "Rajesh Kumar", "role": "assistant_engineer", "zone": "North Zone", "password": "demo123"},
                {"username": "ae_south", "full_name": "Priya Sharma", "role": "assistant_engineer", "zone": "South Zone", "password": "demo123"},
                {"username": "je_north", "full_name": "Amit Singh", "role": "junior_engineer", "zone": "North Zone", "password": "demo123"},
                {"username": "je_east", "full_name": "Suresh Verma", "role": "junior_engineer", "zone": "East Zone", "password": "demo123"},
                {"username": "ee_central", "full_name": "Dr. Anita Gupta", "role": "executive_engineer", "zone": "Central Zone", "password": "demo123"},
            ]
            for eng in demo_engineers:
                user = User(
                    username=eng["username"],
                    full_name=eng["full_name"],
                    hashed_password=get_password_hash(eng["password"]),
                    role=eng["role"],
                    zone=eng["zone"]
                )
                db.add(user)

            db.commit()
    finally:
        db.close()


def _generate_sample_image(width: int, height: int, label: str, color: tuple) -> bytes:
    """Generate a sample construction-site-style placeholder image."""
    img = PILImage.new("RGB", (width, height), color)
    draw = ImageDraw.Draw(img)
    # Draw a grid pattern to simulate a building/construction look
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 80), width=1)
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(255, 255, 255, 80), width=1)
    # Draw diagonal "construction" stripes
    for offset in range(-height, width, 30):
        draw.line([(offset, 0), (offset + height, height)], fill=(0, 0, 0), width=2)
    # Draw a filled rectangle as banner for text
    banner_y = height // 2 - 20
    draw.rectangle([(10, banner_y), (width - 10, banner_y + 40)], fill=(0, 0, 0))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except (OSError, IOError):
        font = ImageFont.load_default()
    draw.text((20, banner_y + 10), label, fill=(255, 255, 255), font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


@app.on_event("startup")
def seed_demo_data():
    """Seed demo reports and media so the Control Panel is not empty."""
    db = SessionLocal()
    try:
        existing_media = db.query(Media).first()
        if existing_media:
            return  # Already seeded

        # Get engineers to attach reports to
        engineers = db.query(User).filter(User.role != "admin").all()
        if not engineers:
            return

        demo_sites = [
            {
                "address": "B-45, Lajpat Nagar-IV, Near Moolchand Metro Station, New Delhi",
                "zone": "South Zone", "ward": "Ward 78S",
                "activity": "unauthorized_construction",
                "lat": 28.5688, "lng": 77.2386,
                "label": "UNAUTHORIZED FLOOR ADDITION",
                "color": (180, 80, 60),
            },
            {
                "address": "Plot 12, Rohini Sector-11, Near Rithala Metro, Delhi",
                "zone": "Rohini", "ward": "Ward 23R",
                "activity": "deviation_from_sanctioned_plan",
                "lat": 28.7220, "lng": 77.1070,
                "label": "PLAN DEVIATION - EXTRA ROOMS",
                "color": (60, 100, 160),
            },
            {
                "address": "Khasra 234, Village Samalkha, NH-8, South West Delhi",
                "zone": "West Zone", "ward": "Ward 5W",
                "activity": "construction_on_govt_land",
                "lat": 28.5130, "lng": 77.0340,
                "label": "CONSTRUCTION ON GOVT LAND",
                "color": (160, 50, 50),
            },
            {
                "address": "A-Block, Connaught Place, Central Delhi",
                "zone": "Central Zone", "ward": "Ward 1C",
                "activity": "encroachment",
                "lat": 28.6315, "lng": 77.2167,
                "label": "ENCROACHMENT ON PUBLIC PATH",
                "color": (100, 140, 60),
            },
            {
                "address": "House No. 15, Street 4, Shahdara, East Delhi",
                "zone": "North Shahdara Zone", "ward": "Ward 42E",
                "activity": "unauthorized_construction",
                "lat": 28.6810, "lng": 77.2890,
                "label": "ILLEGAL MULTI-STOREY BUILDING",
                "color": (140, 90, 50),
            },
            {
                "address": "DDA Flat 301, Munirka, South Delhi",
                "zone": "South Zone", "ward": "Ward 62S",
                "activity": "unauthorized_urbanisation",
                "lat": 28.5530, "lng": 77.1750,
                "label": "ILLEGAL COMMERCIAL CONVERSION",
                "color": (80, 80, 150),
            },
        ]

        now = datetime.utcnow()
        for i, site in enumerate(demo_sites):
            eng = engineers[i % len(engineers)]
            report = Report(
                engineer_id=eng.id,
                property_address=site["address"],
                zone=site["zone"],
                ward=site["ward"],
                visit_date=now - timedelta(hours=i * 3),
                activity_type=site["activity"],
                activity_description=f"Demo report for {site['label'].lower()}",
                latitude=site["lat"],
                longitude=site["lng"],
                status="pending",
                remarks="Seeded demo data",
            )
            db.add(report)
            db.commit()
            db.refresh(report)

            # Generate sample image
            img_data = _generate_sample_image(800, 600, site["label"], site["color"])
            thumb_data = generate_thumbnail(img_data)
            unique_name = f"{uuid.uuid4().hex}.jpg"

            media = Media(
                report_id=report.id,
                engineer_id=eng.id,
                media_type="image",
                file_path=f"/api/media/file/{unique_name}",
                file_name=f"site_photo_{i+1}.jpg",
                latitude=site["lat"],
                longitude=site["lng"],
                capture_time=now - timedelta(hours=i * 3),
                file_size=len(img_data),
                file_data=img_data,
                thumbnail_data=thumb_data or None,
                content_type="image/jpeg",
            )
            db.add(media)
            db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "MCD Construction Monitor - Trial", "database": "postgresql"}
