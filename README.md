# MCD Unauthorized Construction Monitoring System

A full-stack web application for the Municipal Corporation of Delhi (MCD) to monitor unauthorized construction activities across zones. The system enables zonal engineers to report violations with photographic/video evidence, and provides administrators with real-time dashboards and summary reports.

## Features

### For Engineers (Mobile-Friendly PWA)
- **Data Entry Module**: Record unauthorized construction details including property address, visit date/time, type of unauthorized activity, ownership details, and last sanctioned plan
- **Image/Video Capture Module**: Capture photos using device camera or upload images/videos with automatic GPS location and timestamp tagging
- **Report History**: View previously submitted reports

### For Administrators
- **Admin Dashboard**: Overview of all reports with statistics, status breakdown, and recent activity
- **Daily Summary Reports**: Zone-wise daily reports with activity breakdown, exportable to CSV
- **Live Control Panel**: Real-time image/video feed from field engineers with fullscreen mode for big screen display
- **User Management**: Create and manage engineer accounts with role-based access

### Role-Based Access Control
| Role | Access Level |
|------|-------------|
| **Assistant Engineer** | Data entry + media capture for own reports |
| **Junior Engineer** | Data entry + media capture + zone reports |
| **Executive Engineer** | All above + admin dashboard + control panel + status updates |
| **Administrator** | Full access including user management |

### Types of Unauthorized Activity
- Unauthorized Construction
- Unauthorized Urbanisation
- Construction on Government Land
- Deviation from Sanctioned Plan
- Encroachment
- Other

## Tech Stack

- **Backend**: Python FastAPI + SQLAlchemy + SQLite
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Authentication**: JWT-based with role-based access control
- **Media**: File upload with GPS and timestamp metadata

## Project Structure

```
mcd-construction-monitor/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT authentication & RBAC
│   ├── requirements.txt     # Python dependencies
│   ├── routes/
│   │   ├── auth_routes.py        # Login, register, user management
│   │   ├── data_entry_routes.py  # Report CRUD operations
│   │   ├── media_routes.py       # Image/video upload & management
│   │   ├── report_routes.py      # Daily summaries & statistics
│   │   └── control_panel_routes.py # Live feed & zone data
│   └── uploads/             # Uploaded media storage
│       ├── images/
│       └── videos/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with routing & layout
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login page
│   │   │   ├── DataEntry.jsx      # Data entry module
│   │   │   ├── MediaCapture.jsx   # Image/video capture module
│   │   │   ├── Reports.jsx        # Daily summary reports
│   │   │   ├── AdminDashboard.jsx # Admin dashboard
│   │   │   ├── ControlPanel.jsx   # Live media control panel
│   │   │   ├── UserManagement.jsx # User CRUD
│   │   │   └── ReportDetail.jsx   # Single report view
│   │   └── utils/
│   │       └── api.js       # API client utilities
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Setup & Running

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to the backend on port 8000.

## Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| ae_north | demo123 | Assistant Engineer (North Zone) |
| ae_south | demo123 | Assistant Engineer (South Zone) |
| je_north | demo123 | Junior Engineer (North Zone) |
| je_east | demo123 | Junior Engineer (East Zone) |
| ee_central | demo123 | Executive Engineer (Central Zone) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Register new user (admin only) |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/users` | List all users (admin only) |
| POST | `/api/reports/` | Create new report |
| GET | `/api/reports/` | List reports (filtered by role) |
| GET | `/api/reports/{id}` | Get report detail |
| PUT | `/api/reports/{id}/status` | Update report status |
| POST | `/api/media/upload/{report_id}` | Upload image/video |
| GET | `/api/media/report/{report_id}` | Get report media |
| GET | `/api/media/latest` | Get latest media |
| GET | `/api/reports-summary/daily` | Daily zone-wise summary |
| GET | `/api/reports-summary/stats` | Overall statistics |
| GET | `/api/control-panel/live-feed` | Live media feed |
