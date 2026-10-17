import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOAD_DIR
from .database import engine, Base
from .routers import patients, records, verification

# Import models so SQLAlchemy knows about all tables
from . import models


# --------------------------------------
# 1. Create database tables
# --------------------------------------

Base.metadata.create_all(bind=engine)


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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads",
)


# --------------------------------------
# 6. Register API routes
# --------------------------------------

app.include_router(
    patients.router,
    prefix="/api/patients",
    tags=["Patients"],
)

app.include_router(
    records.router,
    prefix="/api/records",
    tags=["Records"],
)

app.include_router(
    verification.router,
    prefix="/api/verify",
    tags=["Verification"],
)


# --------------------------------------
# 7. Root endpoint
# --------------------------------------

@app.get("/")
def root():
    return {
        "message": "CareLink Handoff API is running",
        "docs": "/docs",
    }