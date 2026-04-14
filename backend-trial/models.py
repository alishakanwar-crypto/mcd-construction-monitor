from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SAEnum, LargeBinary
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EXECUTIVE_ENGINEER = "executive_engineer"
    JUNIOR_ENGINEER = "junior_engineer"
    ASSISTANT_ENGINEER = "assistant_engineer"


class UnauthorizedActivityType(str, enum.Enum):
    UNAUTHORIZED_CONSTRUCTION = "unauthorized_construction"
    UNAUTHORIZED_URBANISATION = "unauthorized_urbanisation"
    CONSTRUCTION_ON_GOVT_LAND = "construction_on_govt_land"
    DEVIATION_FROM_SANCTIONED_PLAN = "deviation_from_sanctioned_plan"
    ENCROACHMENT = "encroachment"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    hashed_password = Column(String(500), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.ASSISTANT_ENGINEER)
    zone = Column(String(100), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    reports = relationship("Report", back_populates="engineer")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_address = Column(Text, nullable=False)
    zone = Column(String(100), nullable=False)
    ward = Column(String(100), nullable=True)
    visit_date = Column(DateTime, nullable=False)
    activity_type = Column(String(100), nullable=False)
    activity_description = Column(Text, nullable=True)
    owner_name = Column(String(200), nullable=True)
    owner_contact = Column(String(100), nullable=True)
    ownership_type = Column(String(100), nullable=True)
    last_sanctioned_plan = Column(String(200), nullable=True)
    sanctioned_plan_date = Column(DateTime, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(50), default="pending")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    engineer = relationship("User", back_populates="reports")
    media = relationship("Media", back_populates="report")


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    media_type = Column(String(20), nullable=False)  # image or video
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(300), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    capture_time = Column(DateTime, nullable=True)
    file_size = Column(Integer, nullable=True)
    file_data = Column(LargeBinary, nullable=True)  # Store image binary in DB for persistence
    thumbnail_data = Column(LargeBinary, nullable=True)  # Thumbnail binary (max 300px)
    content_type = Column(String(100), nullable=True)  # MIME type for serving
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="media")
    engineer = relationship("User")
