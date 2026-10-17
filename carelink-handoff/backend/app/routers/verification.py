import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal

from ..database import get_db
from ..models import ExtractedFact, Verification


router = APIRouter()


# --------------------------------------
# Verification request schema
# --------------------------------------

class VerifyRequest(BaseModel):
    source_type: Literal[
        "health_worker",
        "patient_voice"
    ] = "health_worker"

    value: str = Field(default="", max_length=2000)


# --------------------------------------
# 1. Confirm an extracted fact
# --------------------------------------

@router.post("/{fact_id}/confirm")
def confirm_fact(
    fact_id: str,
    req: VerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Record a confirmation of an extracted fact.

    Authentication and reviewer authorization
    must be added before real-world use.
    """

    fact = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.id == fact_id)
        .first()
    )

    if not fact:
        raise HTTPException(
            status_code=404,
            detail="Fact not found"
        )

    # Update verification status
    fact.status = "verified"

    # Read the existing verification sources
    verified_list = json.loads(
        fact.verified_by or "[]"
    )

    # Add the new verification source
    if req.source_type not in verified_list:
        verified_list.append(req.source_type)

    fact.verified_by = json.dumps(verified_list)

    # Increase the prototype confidence score
    current_confidence = fact.confidence or 0.5

    fact.confidence = min(
        0.99,
        current_confidence + 0.10
    )

    # Save verification history
    verification = Verification(
        fact_id=fact_id,
        source_type=req.source_type,
        value=req.value,
    )

    db.add(verification)
    db.commit()
    db.refresh(fact)

    return {
        "status": "verified",
        "confidence": fact.confidence
    }


# --------------------------------------
# 2. Reject an extracted fact
# --------------------------------------

@router.post("/{fact_id}/reject")
def reject_fact(
    fact_id: str,
    db: Session = Depends(get_db)
):
    """
    Mark a fact as unverified because
    the reviewer rejected its accuracy.
    """

    fact = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.id == fact_id)
        .first()
    )

    if not fact:
        raise HTTPException(
            status_code=404,
            detail="Fact not found"
        )

    fact.status = "unverified"

    current_confidence = fact.confidence or 0.5

    fact.confidence = max(
        0.1,
        current_confidence - 0.20
    )

    db.commit()
    db.refresh(fact)

    return {
        "status": "unverified",
        "confidence": fact.confidence
    }


# --------------------------------------
# 3. Resolve a conflict
# --------------------------------------

@router.post("/{fact_id}/resolve-conflict")
def resolve_conflict(
    fact_id: str,
    db: Session = Depends(get_db)
):
    """
    Mark the selected fact as verified
    and flag linked conflicting facts
    for further review.
    """

    fact = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.id == fact_id)
        .first()
    )

    if not fact:
        raise HTTPException(
            status_code=404,
            detail="Fact not found"
        )

    # Read conflicts BEFORE clearing them
    conflicts = []

    if fact.conflict_details:
        try:
            conflicts = json.loads(
                fact.conflict_details
            )
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid stored conflict details"
            )

    if not isinstance(conflicts, list):
        raise HTTPException(
            status_code=400,
            detail="Conflict details must be a list"
        )

    # Mark selected fact as verified
    fact.status = "verified"
    fact.confidence = 0.95

    # Flag linked facts for human review.
    # Do not automatically assume they are wrong.
    for conflict in conflicts:

        if not isinstance(conflict, dict):
            continue

        conflicting_id = conflict.get(
            "existing_fact_id"
        )

        if not conflicting_id:
            continue

        conflicting = (
            db.query(ExtractedFact)
            .filter(
                ExtractedFact.id == conflicting_id
            )
            .first()
        )

        if conflicting and conflicting.id != fact.id:
            conflicting.status = "unverified"

    # Clear the selected fact's conflict details
    fact.conflict_details = None

    db.commit()

    return {
        "status": "resolved"
    }