import os
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi import HTTPException

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOAD_DIR
from .database import engine, Base, upgrade_record_details, upgrade_patient_phone, upgrade_mobile_profile, get_db
from . import security, mobile
from .routers import patients, records, verification, esp32_bridge, whatsapp_webhook

# Import models so SQLAlchemy knows about all tables
from . import models


# --------------------------------------
# 1. Create database tables
# --------------------------------------

Base.metadata.create_all(bind=engine)
upgrade_record_details(engine)
upgrade_patient_phone(engine)
upgrade_mobile_profile(engine)

def _auto_provision():
    if os.getenv("CARELINK_CLOUD_MODE") == "1":
        try:
            from sqlalchemy.orm import Session
            from .models import Account, Patient, Assignment
            from .security import hash_password
            with Session(engine) as db:
                p = db.query(Patient).first()
                if not p:
                    p = Patient(name="Asha Demo", age=28)
                    db.add(p)
                    db.flush()

                if not db.query(Account).filter_by(username="testdoctor").first():
                    doc = Account(username="testdoctor", password_hash=hash_password("CareLink@2026"), role="clinician")
                    db.add(doc)
                    db.flush()
                    db.add(Assignment(account_id=doc.id, patient_id=p.id))

                if not db.query(Account).filter_by(username="patient1").first():
                    pat = Account(username="patient1", password_hash=hash_password("CareLink@2026"), role="patient", patient_id=p.id)
                    db.add(pat)
                    db.flush()
                    db.add(Assignment(account_id=pat.id, patient_id=p.id))

                db.commit()
                print("INFO: Cloud auto-provisioning completed: testdoctor and patient1")
        except Exception as e:
            print(f"WARNING: Cloud auto-provisioning skipped: {e}")

_auto_provision()


# --------------------------------------
# 2. Create FastAPI application
# --------------------------------------

app = FastAPI(
    title="CareLink Handoff API",
    description=(
        "Consultation-ready patient journey "
        "with source-linked facts"
    ),
    version="1.0.0",
)


# --------------------------------------
# 3. Configure CORS for local frontend
# --------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CARELINK_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------
# 4. Create uploads directory
# --------------------------------------

os.makedirs(UPLOAD_DIR, exist_ok=True)


# --------------------------------------
# 5. Serve uploaded files
# --------------------------------------

@app.get("/uploads/{path:path}")
def protected_upload(path: str, db=Depends(get_db), account=Depends(security.current_account)):
    from sqlalchemy import func
    record = db.query(models.Record).filter(func.replace(models.Record.source_image_path, "\\", "/") == "uploads/" + path).first()
    if not record:
        raise HTTPException(404, "Document not found")
    return security.document(record.id, db, account)


@app.middleware("http")
async def privacy_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(("/api/", "/uploads/")):
        response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


app.include_router(security.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(mobile.router, prefix="/api/mobile", tags=["Mobile profiles"])


# --------------------------------------
# 6. Register API routes
# --------------------------------------

app.include_router(
    patients.router,
    prefix="/api/patients",
    tags=["Patients"],
    dependencies=[Depends(security.authorize)],
)

app.include_router(
    records.router,
    prefix="/api/records",
    tags=["Records"],
    dependencies=[Depends(security.authorize)],
)

app.include_router(
    verification.router,
    prefix="/api/verify",
    tags=["Verification"],
    dependencies=[Depends(security.authorize)],
)


# --------------------------------------
# 7. Root endpoint
# --------------------------------------

app.include_router(esp32_bridge.router, prefix="/api/esp32", tags=["ESP32"], dependencies=[Depends(security.current_account)])
app.include_router(whatsapp_webhook.router, prefix="/api/webhook", tags=["WhatsApp"])

@app.get("/api/health")
def root():
    return {
        "message": "CareLink Handoff API is running",
        "docs": "/docs",
    }

BUILD_DIR = Path(__file__).resolve().parents[2] / "frontend" / "carelink-app" / "build"

@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path.startswith(("api/", "uploads/")):
        raise HTTPException(status_code=404, detail="Not found")
    target = (BUILD_DIR / path).resolve()
    if not target.is_relative_to(BUILD_DIR.resolve()):
        raise HTTPException(status_code=404, detail="Not found")
    if target.is_file():
        return FileResponse(target, headers={"Cache-Control": "no-cache"})
    if (BUILD_DIR / "index.html").is_file() and (not Path(path).suffix):
        return FileResponse(BUILD_DIR / "index.html", headers={"Cache-Control": "no-cache"})
    if not path:
        return root()
    raise HTTPException(status_code=404, detail="Frontend build not found")
