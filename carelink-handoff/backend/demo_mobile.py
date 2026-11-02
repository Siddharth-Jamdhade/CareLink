"""Opt-in localhost synthetic demo. Never reads or writes carelink.db."""
import os
from pathlib import Path
from datetime import date, timedelta

root = Path(__file__).parent.resolve() / '.mobile-demo'
root.mkdir(exist_ok=True)
os.environ['CARELINK_DATABASE_URL'] = 'sqlite:///' + (root / 'demo.db').as_posix()
os.environ['CARELINK_UPLOAD_DIR'] = str(root / 'uploads')
os.environ['CARELINK_COOKIE_SECURE'] = '0'  # Localhost only; the production default is secure.
password = os.environ.get('CARELINK_DEMO_PASSWORD')
if not password or len(password) < 12:
    raise SystemExit('Set CARELINK_DEMO_PASSWORD (12+ characters). This server is synthetic and localhost-only.')

from app.main import app
from app.database import SessionLocal
from app.models import Patient, Account, Assignment, Record, ExtractedFact
from app.security import hash_password
from PIL import Image, ImageDraw

with SessionLocal() as db:
    patient = db.get(Patient, 'synthetic-mobile')
    if not patient:
        patient = Patient(id='synthetic-mobile', name='Synthetic · Asha', age=28, lmp=(date.today() - timedelta(days=143)).isoformat(), gestational_week=20)
        db.add(patient); db.flush()
        folder = root / 'uploads' / patient.id; folder.mkdir(parents=True, exist_ok=True)
        image = Image.new('RGB', (640, 480), '#fff9ee'); draw = ImageDraw.Draw(image)
        draw.text((35, 40), 'SYNTHETIC DEVELOPMENT DOCUMENT - NOT A MEDICAL RECORD', fill='#164a3d')
        draw.text((35, 90), 'ANC card | Demonstration Clinic | Pending review', fill='#164a3d')
        image.save(folder / 'demo.png')
        record = Record(id='synthetic-document', patient_id=patient.id, source_image_path='uploads/synthetic-mobile/demo.png', original_filename='synthetic-demo.png')
        db.add(record); db.flush()
        db.add(ExtractedFact(record_id=record.id, patient_id=patient.id, visit_date=date.today().isoformat(), facility_name='Synthetic Demonstration Clinic', document_type='Synthetic ANC card', provider_name='Synthetic provider', next_appointment=(date.today() + timedelta(days=14)).isoformat(), pending_items='["Review source document"]', confidence=0.8, status='unverified'))
    for role in ('patient', 'staff', 'clinician'):
        account = db.query(Account).filter_by(username='demo-' + role).first()
        if not account:
            account = Account(username='demo-' + role, role=role, patient_id=patient.id if role == 'patient' else None, password_hash=hash_password(password))
            db.add(account); db.flush()
            db.add(Assignment(account_id=account.id, patient_id=patient.id))
        else:
            account.password_hash = hash_password(password)
    db.commit()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8011, access_log=False)
