from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: str = "assistant_engineer"
    zone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    zone: Optional[str] = None
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class ReportCreate(BaseModel):
    property_address: str
    zone: str
    ward: Optional[str] = None
    visit_date: datetime
    activity_type: str
    activity_description: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    ownership_type: Optional[str] = None
    last_sanctioned_plan: Optional[str] = None
    sanctioned_plan_date: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    remarks: Optional[str] = None


class ReportResponse(BaseModel):
    id: int
    engineer_id: int
    property_address: str
    zone: str
    ward: Optional[str] = None
    visit_date: datetime
    activity_type: str
    activity_description: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    ownership_type: Optional[str] = None
    last_sanctioned_plan: Optional[str] = None
    sanctioned_plan_date: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    engineer_name: Optional[str] = None
    engineer_role: Optional[str] = None
    media_count: int = 0

    class Config:
        from_attributes = True


class MediaResponse(BaseModel):
    id: int
    report_id: int
    engineer_id: int
    media_type: str
    file_path: str
    file_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capture_time: Optional[datetime] = None
    file_size: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DailySummary(BaseModel):
    zone: str
    total_reports: int
    activity_breakdown: dict
    engineer_count: int
    media_count: int
    date: str


class ZoneSummary(BaseModel):
    date: str
    zones: List[DailySummary]
    grand_total: int
