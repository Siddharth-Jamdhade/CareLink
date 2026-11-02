"""Fail-closed session authentication shared by portal and mobile clients."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import get_db
from .models import Account, Assignment, LoginSession, ExtractedFact, Record

router = APIRouter()
COOKIE = "carelink_session"


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    return salt + ":" + hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def current_account(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE, "")
    session = db.get(LoginSession, digest(token)) if token else None
    if not session or session.expires_at <= datetime.utcnow():
        raise HTTPException(401, "Please sign in")
    account = db.get(Account, session.account_id)
    if not account:
        raise HTTPException(401, "Please sign in")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        # Browser mutations must explicitly opt in; prevents cross-site form CSRF.
        if request.headers.get("X-CareLink-Client") != "1":
            raise HTTPException(403, "Missing client request header")
    request.state.account = account
    return account


def allowed_ids(account, db):
    if account.role == "patient":
        return [account.patient_id] if account.patient_id else []
    return [a.patient_id for a in db.query(Assignment).filter_by(account_id=account.id)]


def require_patient(account, patient_id, db):
    if patient_id not in allowed_ids(account, db):
        raise HTTPException(403, "This record is not assigned to your account")


def authorize(request: Request, db: Session = Depends(get_db), account=Depends(current_account)):
    parts = request.url.path.strip("/").split("/")
    group = parts[1] if len(parts) > 1 else ""
    patient_id = None
    if group == "patients":
        if request.method == "DELETE" and account.role not in ("staff", "clinician"):
            raise HTTPException(403, "Assigned staff must manage patient deletion")
        if len(parts) > 2:
            patient_id = parts[2]
        elif request.method == "POST" and account.role not in ("staff", "clinician"):
            raise HTTPException(403, "Staff account required")
    elif group == "records" and len(parts) > 3:
        patient_id = parts[3]
    elif group == "verify" and len(parts) > 2:
        if account.role not in ("staff", "clinician"):
            raise HTTPException(403, "An assigned healthcare worker must verify records")
        fact = db.get(ExtractedFact, parts[2])
        if not fact:
            raise HTTPException(404, "Fact not found")
        patient_id = fact.patient_id
    if patient_id:
        require_patient(account, patient_id, db)
    return account


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=256)


# Bounded, per-process limiter. Deploy behind a rate-limiting reverse proxy too.
_attempts = {}


@router.post("/login")
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    key = request.client.host if request.client else "unknown"
    for address in list(_attempts):
        if _attempts[address][0] < now - timedelta(minutes=15):
            del _attempts[address]
    started, count = _attempts.get(key, (now, 0))
    if count >= 10:
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    _attempts[key] = (started, count + 1)
    account = db.query(Account).filter_by(username=body.username).first()
    stored = account.password_hash if account else hash_password("unavailable")
    if not hmac.compare_digest(stored, hash_password(body.password, stored.split(":")[0])) or not account:
        raise HTTPException(401, "Sign-in details were not recognised")
    _attempts.pop(key, None)
    token = secrets.token_urlsafe(32)
    db.add(LoginSession(token_hash=digest(token), account_id=account.id, expires_at=now + timedelta(hours=8)))
    db.commit()
    response.set_cookie(COOKIE, token, httponly=True, secure=os.getenv("CARELINK_COOKIE_SECURE", "1") == "1", samesite="strict", max_age=28800, path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"role": account.role, "patient_id": account.patient_id}


@router.get("/me")
def me(account=Depends(current_account)):
    return {"role": account.role, "patient_id": account.patient_id}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db), account=Depends(current_account)):
    token = request.cookies.get(COOKIE, "")
    session = db.get(LoginSession, digest(token))
    if session:
        db.delete(session)
        db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"status": "signed_out"}


@router.get("/document/{record_id}")
def document(record_id: str, db: Session = Depends(get_db), account=Depends(current_account)):
    from pathlib import Path
    from fastapi.responses import FileResponse
    from .config import UPLOAD_DIR
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Document not found")
    require_patient(account, record.patient_id, db)
    relative = record.source_image_path.replace("\\", "/").removeprefix("uploads/")
    root = Path(UPLOAD_DIR).resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(404, "Document not found")
    return FileResponse(target, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
