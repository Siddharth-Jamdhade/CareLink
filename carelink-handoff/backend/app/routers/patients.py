import io
import os
from pathlib import Path
from urllib.parse import urlsplit
from ..config import UPLOAD_DIR
import qrcode

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Patient, ExtractedFact, Record, Verification
from ..schemas import PatientCreate, PatientResponse, FactResponse
from ..services.protocol_checker import check_protocol_gaps
from ..security import current_account, allowed_ids
from ..models import Assignment
from ..services.journey_links import journey_url


router = APIRouter()


@router.get("/{patient_id}/nfc-link")
def nfc_link(patient_id: str, request: Request, db: Session = Depends(get_db), account=Depends(current_account)):
    if account.role not in ('staff', 'clinician'):
        raise HTTPException(403, 'Assigned staff must prepare NFC bands')
    if not db.get(Patient, patient_id):
        raise HTTPException(404, 'Patient not found')
    cloud = os.getenv('CARELINK_CLOUD_MODE') == '1'
    origin = os.getenv('FRONTEND_URL') or str(request.base_url).rstrip('/')
    if cloud and not origin.startswith('https://'):
        raise HTTPException(503, 'The cloud HTTPS origin is not configured')
    return {'url': journey_url(patient_id, origin), 'requires_sign_in': True,
            'local_esp32_available': not cloud,
            'instructions': 'Write this URL as an NDEF URL record using an NFC-capable phone or a nearby NFC writer. Scanning requires sign-in and patient authorisation.'}


# --------------------------------------
# 1. Create a new patient
# --------------------------------------

@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    account=Depends(current_account),
):
    """Create a new patient."""

    db_patient = Patient(
        name=patient.name,
        phone_number=patient.phone_number,
        age=patient.age,
        gestational_week=patient.gestational_week,
    )

    db.add(db_patient)
    db.flush()
    db.add(Assignment(account_id=account.id, patient_id=db_patient.id))
    db.commit()
    db.refresh(db_patient)

    return db_patient


# --------------------------------------
# 2. List all patients
# --------------------------------------

@router.get("/", response_model=list[PatientResponse])
def list_patients(db: Session = Depends(get_db), account=Depends(current_account)):
    """List all patients."""

    patients = db.query(Patient).filter(Patient.id.in_(allowed_ids(account, db))).all()
    return [dict(PatientResponse.model_validate(p).model_dump(),
                 record_count=len(p.records),
                 conflict_count=sum(f.status == "conflict" for f in p.facts),
                 pending_count=sum(f.status == "unverified" for f in p.facts)) for p in patients]


# --------------------------------------
# 3. Get a single patient
# --------------------------------------

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Get a single patient."""

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient


# --------------------------------------
# 4. Get patient consultation journey
# --------------------------------------

@router.get("/{patient_id}/journey")
def get_journey(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the full consultation-ready journey for a patient.

    This endpoint powers the one-page consultation view.
    """

    # Find patient
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # Get extracted facts sorted by visit date
    facts = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.patient_id == patient_id)
        .order_by(ExtractedFact.visit_date.asc())
        .all()
    )

    # Convert facts into API responses
    fact_responses = []

    for fact in facts:
        fr = FactResponse.model_validate(fact)

        fr.source_image_path = (
            fact.record.source_image_path.replace("\\", "/")
            if fact.record
            else None
        )

        fact_responses.append(fr)

    # Check documentation gaps
    missing = check_protocol_gaps(
        patient.gestational_week,
        facts
    )

    # Collect existing conflicts
    conflicts = [
        {
            "fact_id": fact.id,
            "details": fact.conflict_details
        }
        for fact in facts
        if fact.status == "conflict"
    ]

    return {
        "patient": PatientResponse.model_validate(patient),
        "facts": fact_responses,
        "missing_items": missing,
        "conflicts": conflicts,
    }


# --------------------------------------
# 5. Generate patient QR code
# --------------------------------------

@router.get("/{patient_id}/qr")
def get_qr_code(
    patient_id: str,
    request: Request,
    frontend_origin: str | None = None,
    db: Session = Depends(get_db)
):
    """Generate a QR code for a patient's page."""

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # Frontend patient page URL
    origin = frontend_origin or os.getenv("FRONTEND_URL") or str(request.base_url).rstrip("/")
    parsed = urlsplit(origin)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise HTTPException(status_code=400, detail="Invalid frontend origin")
    url = f"{origin.rstrip('/')}/patient/{patient_id}"

    # Generate QR image
    qr = qrcode.make(url)

    # Save image into memory
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/png"
    )


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    root = Path(UPLOAD_DIR).resolve()
    paths = [(root / r.source_image_path.replace('\\', '/').removeprefix('uploads/')).resolve() for r in patient.records]
    fact_ids = db.query(ExtractedFact.id).filter(ExtractedFact.patient_id == patient_id)
    db.query(Verification).filter(Verification.fact_id.in_(fact_ids)).delete(synchronize_session=False)
    db.query(ExtractedFact).filter(ExtractedFact.patient_id == patient_id).delete(synchronize_session=False)
    db.query(Record).filter(Record.patient_id == patient_id).delete(synchronize_session=False)
    db.query(Patient).filter(Patient.id == patient_id).delete(synchronize_session=False)
    db.commit()
    for path in paths:
        if path.is_relative_to(root) and path.is_file():
            path.unlink(missing_ok=True)
