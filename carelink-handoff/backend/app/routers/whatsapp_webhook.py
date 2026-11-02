import io
import logging
import os
import re
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.datastructures import Headers
from starlette.concurrency import run_in_threadpool
from ..database import get_db, SessionLocal
from ..models import Patient, WhatsAppReceipt
from ..services.whatsapp_service import download_image, send_whatsapp_reply
from ..services.journey_links import journey_url
from .records import upload_and_extract

router = APIRouter()
logger = logging.getLogger(__name__)


def normalize_phone(value):
    return re.sub(r"\D", "", value or "")


def match_patient(db, sender, body):
    # Explicit IDs take precedence. Never fall through to a different patient on typo.
    token = (body or "").strip().split(maxsplit=1)[0] if (body or "").strip() else ""
    patients = db.query(Patient).all()
    if token and (token.upper().startswith("P-") or re.fullmatch(r"[0-9a-fA-F-]{4,36}", token)):
        prefix = token[2:] if token.upper().startswith("P-") else token
        matches = [p for p in patients if len(prefix) >= 4 and p.id.lower().startswith(prefix.lower())]
    else:
        number = normalize_phone(sender)
        matches = [p for p in patients if number and normalize_phone(p.phone_number) == number]
    return matches[0] if len(matches) == 1 else None


async def ingest(sid, sender, patient_id, media_url):
    with SessionLocal() as db:
        receipt = db.get(WhatsAppReceipt, sid)
        try:
            patient = db.get(Patient, patient_id)
            if not patient:
                raise ValueError("Patient no longer exists")
            url = journey_url(patient_id)
            content, mime = await run_in_threadpool(download_image, media_url)
            file = UploadFile(io.BytesIO(content), filename="whatsapp.png" if mime == "image/png" else "whatsapp.jpg", headers=Headers({"content-type": mime}))
            result = await upload_and_extract(patient_id, file, db)
            receipt.record_id = result["record_id"]
            receipt.status = "saved"
            db.commit()
            reply = "Record added. Sign in to CareLink to review your journey."
            if result["confidence"] < 0.5:
                reply = "Record saved for review. Sign in to CareLink for details."
        except Exception:
            db.rollback()
            receipt = db.get(WhatsAppReceipt, sid)
            receipt.status = "failed"
            db.commit()
            logger.warning("WhatsApp extraction failed; details omitted for privacy")
            reply = "Unable to extract this image. Please send a clearer JPEG or PNG with the Patient ID."
        try:
            await run_in_threadpool(send_whatsapp_reply, sender, reply)
        except Exception:
            logger.warning("WhatsApp reply failed; ingestion status retained")


@router.post("/whatsapp")
async def whatsapp(request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    if os.getenv("CARELINK_ENABLE_WHATSAPP") != "1":
        raise HTTPException(503, "WhatsApp ingestion requires deployment-specific consent review")
    # Lazy import keeps the rest of CareLink usable before optional SDK installation.
    try:
        from twilio.request_validator import RequestValidator
    except ImportError:
        raise HTTPException(503, "Install the Twilio SDK from requirements.txt")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not token or not os.getenv("TWILIO_ACCOUNT_SID"):
        raise HTTPException(503, "Twilio credentials are not configured")
    form = await request.form()
    public_url = os.getenv("TWILIO_WEBHOOK_URL") or str(request.url)
    if not RequestValidator(token).validate(public_url, form, request.headers.get("X-Twilio-Signature", "")):
        raise HTTPException(403, "Invalid Twilio signature")
    sender, body, media = form.get("From", ""), form.get("Body", ""), form.get("MediaUrl0")
    sid = form.get("MessageSid", "")
    if not re.fullmatch(r"[A-Z]{2}[0-9a-fA-F]{32}", sid):
        raise HTTPException(400, "Missing or invalid MessageSid")
    if db.get(WhatsAppReceipt, sid):
        return Response("<Response/>", media_type="application/xml")
    patient = match_patient(db, sender, body)
    if patient and normalize_phone(patient.phone_number) != normalize_phone(sender):
        patient = None
    if not patient or not media:
        return Response("<Response><Message>Reply with your Patient ID (e.g. P-0417) followed by the image. Use the ID shown on your journey.</Message></Response>", media_type="application/xml")
    db.add(WhatsAppReceipt(id=sid, patient_id=patient.id, status="processing"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return Response("<Response/>", media_type="application/xml")
    background.add_task(ingest, sid, sender, patient.id, media)
    # Acknowledge immediately; OCR may exceed Twilio's webhook response timeout.
    return Response("<Response/>", media_type="application/xml")
