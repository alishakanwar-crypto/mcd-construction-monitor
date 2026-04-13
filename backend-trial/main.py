from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import User
from auth import get_password_hash
from routes.auth_routes import router as auth_router
from routes.data_entry_routes import router as data_entry_router
from routes.media_routes import router as media_router
from routes.report_routes import router as report_router
from routes.control_panel_routes import router as control_panel_router
from routes.image_extract_routes import router as image_extract_router
import os

Base.metadata.create_all(bind=engine)

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


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "MCD Construction Monitor - Trial", "database": "postgresql"}
