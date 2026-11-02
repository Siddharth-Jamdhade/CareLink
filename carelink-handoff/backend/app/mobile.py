import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.orm import Session
from .database import get_db
from .models import Patient, DatingAudit, Account
from .security import current_account, require_patient
from .dating import dating

router = APIRouter()
DATING_FIELDS = ('lmp', 'calculated_edd', 'revised_edd', 'effective_edd', 'edd_source', 'edd_reason')


def profile(patient):
    fields = ("id", "name", "age", "gestational_week", "phone_number", "emergency_contact", "lmp", "revised_edd", "edd_source", "edd_reason", "profile_version")
    result = {key: getattr(patient, key) for key in fields}
    result.update(dating(date.fromisoformat(patient.lmp) if patient.lmp else None,
                         date.fromisoformat(patient.revised_edd) if patient.revised_edd else None))
    return result


@router.get("/{patient_id}/profile")
def get_profile(patient_id: str, db: Session = Depends(get_db), account=Depends(current_account)):
    require_patient(account, patient_id, db)
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    return profile(patient)


@router.get("/{patient_id}/dating-history")
def dating_history(patient_id: str, db: Session = Depends(get_db), account=Depends(current_account)):
    require_patient(account, patient_id, db)
    entries = db.query(DatingAudit).filter_by(patient_id=patient_id).order_by(DatingAudit.created_at.desc()).all()
    result = []
    for entry in entries:
        editor = db.get(Account, entry.account_id)
        result.append({'saved_at': entry.created_at, 'editor_role': editor.role if editor else 'Not recorded',
                       'before': {k: json.loads(entry.before_json).get(k) for k in DATING_FIELDS},
                       'after': {k: json.loads(entry.after_json).get(k) for k in DATING_FIELDS}})
    return result


class ProfilePatch(BaseModel):
    profile_version: int = Field(ge=0)
    phone_number: str | None = Field(default=None, max_length=40)
    emergency_contact: str | None = Field(default=None, max_length=200)
    lmp: date | None = None
    confirm_old_lmp: bool = False
    revised_edd: date | None = None
    edd_source: str | None = Field(default=None, max_length=200)
    edd_reason: str | None = Field(default=None, max_length=2000)


@router.patch("/{patient_id}/profile")
def patch_profile(patient_id: str, body: ProfilePatch, db: Session = Depends(get_db), account=Depends(current_account)):
    require_patient(account, patient_id, db)
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    changes = body.model_dump(exclude_unset=True, exclude={"profile_version", "confirm_old_lmp"})
    if body.lmp:
        age = (date.today() - body.lmp).days
        if age < 0:
            raise HTTPException(422, "LMP cannot be in the future. Please correct the date.")
        if age > 315 and not body.confirm_old_lmp:
            raise HTTPException(422, "LMP is more than 45 weeks ago. Check it and confirm if correct.")
    if any(key in changes for key in ("revised_edd", "edd_source", "edd_reason")):
        if account.role != "clinician":
            raise HTTPException(403, "Only an assigned clinician can revise dating")
        if not body.revised_edd or not (body.edd_source or "").strip() or not (body.edd_reason or "").strip():
            raise HTTPException(422, "Revised EDD, source and reason are required")
        if abs((body.revised_edd - date.today()).days) > 315:
            raise HTTPException(422, "Please correct the revised EDD")
    before = profile(patient)
    changes = {key: value.isoformat() if isinstance(value, date) else value for key, value in changes.items()}
    # Compare-and-swap prevents silent overwrites across portal/mobile sessions.
    result = db.execute(update(Patient).where(Patient.id == patient_id, Patient.profile_version == body.profile_version)
                        .values(**changes, profile_version=body.profile_version + 1))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "This profile changed elsewhere. Reload and review before saving again.")
    db.expire_all()
    after = profile(db.get(Patient, patient_id))
    if any(key in changes for key in ('lmp', 'revised_edd', 'edd_source', 'edd_reason')):
        db.add(DatingAudit(patient_id=patient_id, account_id=account.id,
                           before_json=json.dumps({k: before[k] for k in DATING_FIELDS}, default=str),
                           after_json=json.dumps({k: after[k] for k in DATING_FIELDS}, default=str)))
    db.commit()
    return after
