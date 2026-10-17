import io
import qrcode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Patient, ExtractedFact
from ..schemas import PatientCreate, PatientResponse, FactResponse
from ..services.protocol_checker import check_protocol_gaps


router = APIRouter()


# --------------------------------------
# 1. Create a new patient
# --------------------------------------

@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db)
):
    """Create a new patient."""

    db_patient = Patient(
        name=patient.name,
        age=patient.age,
        gestational_week=patient.gestational_week,
    )

    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    return db_patient


# --------------------------------------
# 2. List all patients
# --------------------------------------

@router.get("/", response_model=list[PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    """List all patients."""

    return db.query(Patient).all()


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
            fact.record.source_image_path
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
    url = f"http://localhost:3000/patient/{patient_id}"

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