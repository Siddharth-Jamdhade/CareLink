import os
import json
import uuid

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
)
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Patient, Record, ExtractedFact
from ..config import UPLOAD_DIR

from ..services.ocr_service import extract_text_from_image
from ..services.llm_extractor import extract_facts_from_image
from ..services.conflict_detector import detect_conflicts


router = APIRouter()

MAX_UPLOAD_SIZE = 10 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


@router.post("/upload/{patient_id}")
async def upload_and_extract(
    patient_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload an image, run OCR, extract administrative
    facts with Gemini, save facts, and detect conflicts.
    """

    # Step 1: Verify patient exists

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

    # Step 2: Validate uploaded file

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are supported"
        )

    content = await file.read(MAX_UPLOAD_SIZE + 1)

    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be 10 MB or smaller"
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty"
        )

    # Step 3: Save the uploaded image

    patient_dir = os.path.join(
        UPLOAD_DIR,
        str(patient.id)
    )

    os.makedirs(patient_dir, exist_ok=True)

    extension = ALLOWED_IMAGE_TYPES[file.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"

    file_path = os.path.join(patient_dir, filename)

    with open(file_path, "wb") as output:
        output.write(content)

    # Step 4: Run OCR

    try:
        ocr_text = extract_text_from_image(file_path)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="OCR processing failed"
        )

    # Step 5: Run Gemini extraction

    extracted = extract_facts_from_image(
        file_path,
        ocr_text
    )

    # The extraction service returns a low confidence
    # and an error note when extraction fails.

    if (
        not isinstance(extracted, dict)
        or extracted.get("_confidence", 0) <= 0.1
    ):
        raise HTTPException(
            status_code=502,
            detail="AI extraction failed; no facts were saved"
        )

    # Step 6: Create the Record entry

    record = Record(
        patient_id=patient_id,
        source_image_path=file_path,
        original_filename=file.filename,
    )

    db.add(record)
    db.flush()

    # Step 7: Prepare pending items

    pending_items = extracted.get("pending_items", [])

    if isinstance(pending_items, list):
        pending_items = json.dumps(pending_items)

    # Step 8: Save extracted facts

    fact = ExtractedFact(
        record_id=record.id,
        patient_id=patient_id,
        visit_date=extracted.get("visit_date"),
        facility_name=extracted.get("facility_name"),
        document_type=extracted.get("document_type"),
        gestational_week=extracted.get("gestational_week"),
        pending_items=pending_items,
        provider_name=extracted.get("provider_name"),
        next_appointment=extracted.get("next_appointment"),
        confidence=extracted.get("_confidence", 0.5),
        status="unverified",
        verified_by='["document"]',
        confidence_notes=extracted.get("confidence_notes"),
    )

    db.add(fact)
    db.flush()

    # Step 9: Check existing records for conflicts

    existing_facts = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.patient_id == patient_id)
        .filter(ExtractedFact.id != fact.id)
        .all()
    )

    conflicts = detect_conflicts(
        extracted,
        existing_facts
    )

    # Step 10: Update status if conflicts exist

    if conflicts:
        fact.status = "conflict"
        fact.conflict_details = json.dumps(conflicts)

    # Step 11: Commit database changes

    db.commit()
    db.refresh(record)
    db.refresh(fact)

    # Step 12: Return API response

    return {
        "record_id": record.id,
        "fact_id": fact.id,
        "extracted_data": extracted,
        "confidence": fact.confidence,
        "status": fact.status,
        "conflicts": conflicts,
        "ocr_text": ocr_text,
        "source_image": file_path,
    }