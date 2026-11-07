"""Authenticated RAG, review queue, confirmation and optional Sarvam transcription."""
import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Literal
import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import RagCase, RagEntry
from ..security import current_account, require_patient, allowed_ids
from rag_pipeline import get_rag_suggestion
from rag_knowledge import danger_signs
from feedback_loop import add_verified_case_to_kb

router = APIRouter()

class Vitals(BaseModel):
    bp: str = Field(default='', max_length=20, pattern=r'^(?:\d{2,3}\s*/\s*\d{2,3})?$')
    weight: float | None = Field(default=None, gt=0, le=350)
    pulse: int | None = Field(default=None, gt=0, le=250)

class NurseInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    patient_id: str = Field(min_length=1, max_length=100)
    gestational_week: int = Field(ge=0, le=45)
    chief_complaint: str = Field(min_length=1, max_length=2000)
    trimester: Literal[1, 2, 3]
    vitals: Vitals = Field(default_factory=Vitals)
    symptoms: list[str] = Field(default_factory=list, max_length=30)
    danger_signs: list[str] = Field(default_factory=list, max_length=20)

class ConfirmInput(BaseModel):
    case_id: str
    patient_id: str
    confirmed_form: dict
    was_edited: bool = False
    original_confidence: int = Field(default=0, ge=0, le=100)

class VerifyInput(BaseModel):
    case_id: str
    action: Literal['APPROVE', 'CORRECT']
    corrected_form: dict | None = None

def staff(account):
    if account.role not in ('staff', 'clinician'):
        raise HTTPException(403, 'An assigned healthcare worker account is required.')

def validate_form(form):
    if len(json.dumps(form)) > 20000:
        raise HTTPException(422, 'The form is too large.')
    # Revalidate edited observations instead of trusting the client confidence/route flag.
    try:
        if 'gestational_week' in form and not 0 <= int(form['gestational_week']) <= 45:
            raise ValueError()
        Vitals.model_validate(form.get('vitals', {}))
    except (ValueError, TypeError):
        raise HTTPException(422, 'Check the edited gestational age and vital signs.') from None

def case_for(case_id, db, account):
    row = db.get(RagCase, case_id)
    if not row:
        raise HTTPException(404, 'RAG case not found.')
    require_patient(account, row.patient_id, db)
    return row

@router.get('/rag/status')
async def status(db: Session = Depends(get_db), account=Depends(current_account)):
    staff(account)
    from rag_pipeline import collection
    try:
        col = await asyncio.to_thread(collection)
        total = await asyncio.to_thread(col.count)
        feedback = await asyncio.to_thread(col.get, where={'source': 'doctor_verified'}, include=[])
        feedback_count = len(feedback['ids'])
    except Exception:
        total, feedback_count = 0, 0
    pending = db.query(RagCase).filter(RagCase.patient_id.in_(allowed_ids(account, db)), RagCase.status == 'pending').count()
    return {'voice_available': bool(os.getenv('SARVAM_API_KEY')), 'doctor': account.role == 'clinician',
            'total_documents': total, 'doctor_verified_cases_added': feedback_count, 'pending_cases': pending}

@router.post('/rag/suggest')
async def suggest(body: NurseInput, db: Session = Depends(get_db), account=Depends(current_account)):
    staff(account)
    require_patient(account, body.patient_id, db)
    try:
        suggestion = await get_rag_suggestion(body.model_dump())
    except ValueError as error:
        raise HTTPException(503, str(error)) from None
    row = RagCase(patient_id=body.patient_id, owner_id=account.id, data_json=json.dumps({'input': body.model_dump(), 'suggestion': suggestion}),
                  status='pending' if suggestion['route_to_doctor'] else 'draft', urgency=1 if suggestion['danger_signs_detected'] else 0)
    db.add(row)
    db.commit()
    return {**suggestion, 'case_id': row.id}

@router.post('/rag/confirm')
async def confirm(body: ConfirmInput, db: Session = Depends(get_db), account=Depends(current_account)):
    staff(account)
    row = case_for(body.case_id, db, account)
    if row.patient_id != body.patient_id or row.owner_id != account.id:
        raise HTTPException(403, 'This draft belongs to another entry or patient.')
    if row.record_id:
        return {'success': True, 'record_id': row.record_id}
    validate_form(body.confirmed_form)
    data = json.loads(row.data_json)
    if danger_signs(body.confirmed_form) or body.confirmed_form.get('documented_diagnosis') or body.confirmed_form.get('documented_medications'):
        data['suggestion']['route_to_doctor'] = True
        row.urgency = 1 if danger_signs(body.confirmed_form) else row.urgency
    data['edited_form'] = body.confirmed_form
    row.data_json = json.dumps(data)
    if row.status != 'draft' or data['suggestion']['route_to_doctor']:
        row.status = 'pending'
        db.commit()
        raise HTTPException(409, 'This entry requires doctor verification and is in the review queue.')
    entry = RagEntry(case_id=row.id, patient_id=row.patient_id, form_json=json.dumps(body.confirmed_form), author_id=account.id)
    db.add(entry)
    db.flush()
    row.record_id, row.status = entry.id, 'confirmed'
    db.commit()
    return {'success': True, 'record_id': entry.id}

@router.post('/rag/escalate')
async def escalate(body: ConfirmInput, db: Session = Depends(get_db), account=Depends(current_account)):
    staff(account)
    row = case_for(body.case_id, db, account)
    if row.owner_id != account.id or row.patient_id != body.patient_id:
        raise HTTPException(403, 'This draft belongs to another entry or patient.')
    if row.status != 'draft':
        raise HTTPException(409, 'This entry is already queued or saved.')
    validate_form(body.confirmed_form)
    data = json.loads(row.data_json)
    data['edited_form'] = body.confirmed_form
    data['suggestion']['route_to_doctor'] = True
    row.status, row.data_json = 'pending', json.dumps(data)
    row.urgency = 1 if danger_signs(body.confirmed_form) else 0
    db.commit()
    return {'success': True, 'case_id': row.id, 'route_to_doctor': True}

@router.post('/doctor/verification-queue')
async def queue(db: Session = Depends(get_db), account=Depends(current_account)):
    if account.role != 'clinician':
        raise HTTPException(403, 'Doctor access is required.')
    rows = db.query(RagCase).filter(RagCase.patient_id.in_(allowed_ids(account, db)), RagCase.status == 'pending').order_by(RagCase.urgency.desc(), RagCase.created_at).all()
    return {'cases': [{'case_id': row.id, 'patient_id': row.patient_id, 'urgency': row.urgency, 'created_at': row.created_at.isoformat(), **json.loads(row.data_json)} for row in rows]}

@router.post('/doctor/verify')
async def verify(body: VerifyInput, db: Session = Depends(get_db), account=Depends(current_account)):
    if account.role != 'clinician':
        raise HTTPException(403, 'Doctor access is required.')
    row = case_for(body.case_id, db, account)
    data = json.loads(row.data_json)
    if row.status not in ('pending', 'approved', 'corrected'):
        raise HTTPException(409, 'The case is not waiting for doctor review.')
    if body.action == 'CORRECT' and body.corrected_form is None:
        raise HTTPException(422, 'Provide the corrected form.')
    form = body.corrected_form if body.action == 'CORRECT' else data.get('edited_form', data['suggestion']['pre_filled_form'])
    validate_form(form)
    if not row.record_id:
        claimed = db.query(RagCase).filter(RagCase.id == row.id, RagCase.status == 'pending').update({'status': 'reviewing'}, synchronize_session=False)
        db.commit()
        if not claimed:
            raise HTTPException(409, 'Another reviewer is already saving this case.')
        try:
            entry = RagEntry(case_id=row.id, patient_id=row.patient_id, form_json=json.dumps(form), author_id=account.id)
            db.add(entry)
            db.flush()
            row.record_id = entry.id
            row.status = 'approved' if body.action == 'APPROVE' else 'corrected'
            row.reviewed_by = account.id
            data.update({'verified_form': form, 'reviewed_at': datetime.now(timezone.utc).isoformat(), 'feedback_status': 'pending'})
            row.data_json = json.dumps(data)
            db.commit()
        except Exception:
            db.rollback()
            db.query(RagCase).filter(RagCase.id == row.id, RagCase.status == 'reviewing').update({'status': 'pending'})
            db.commit()
            raise HTTPException(503, 'The reviewed entry could not be saved. Please retry.') from None
    if data.get('feedback_status') != 'complete':
        try:
            await add_verified_case_to_kb(row.id, data['verified_form'])
            data['feedback_status'] = 'complete'
        except Exception:
            data['feedback_status'] = 'retry_required'
        row.data_json = json.dumps(data)
        db.commit()
    return {'success': True, 'record_id': row.record_id, 'feedback_status': data.get('feedback_status')}

@router.post('/sarvam/transcribe')
async def transcribe(file: UploadFile = File(...), language: str = Form('hi-IN'), account=Depends(current_account)):
    staff(account)
    key = os.getenv('SARVAM_API_KEY')
    if not key:
        raise HTTPException(503, 'Voice input unavailable: SARVAM_API_KEY is not configured.')
    if language not in ('hi-IN', 'mr-IN', 'en-IN'):
        raise HTTPException(422, 'Choose Hindi, Marathi or English.')
    audio = await file.read(8 * 1024 * 1024 + 1)
    if not audio or len(audio) > 8 * 1024 * 1024:
        raise HTTPException(422, 'Use a recording under 30 seconds and 8 MB.')
    if (file.content_type or '').split(';')[0] not in ('audio/webm', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/mpeg'):
        raise HTTPException(422, 'Unsupported audio format.')
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post('https://api.sarvam.ai/speech-to-text', headers={'api-subscription-key': key},
                data={'model': os.getenv('SARVAM_MODEL', 'saaras:v4'), 'mode': 'transcribe', 'language_code': language},
                files={'file': (file.filename or 'recording.webm', audio, file.content_type)})
        if not response.is_success:
            raise ValueError()
        data = response.json()
        return {'transcript': data['transcript'], 'language_detected': data.get('language_code') or language}
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(503, 'Voice transcription failed. Please retry or type the complaint.') from None
