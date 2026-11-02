import io
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch, AsyncMock

from fastapi import FastAPI
from tests.authorized_client import TestClient
from PIL import Image
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from twilio.request_validator import RequestValidator
from app.database import Base, get_db, upgrade_patient_phone
from app.models import Patient, Record, ExtractedFact, WhatsAppReceipt

sys.modules.setdefault("app.services.ocr_service", MagicMock())
from app.routers import records, verification, esp32_bridge, whatsapp_webhook


class RemainingFeaturesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        app = FastAPI()
        for router, prefix in [(records.router, "records"), (verification.router, "verify"), (esp32_bridge.router, "esp32"), (whatsapp_webhook.router, "webhook")]:
            app.include_router(router, prefix=f"/api/{prefix}")
        def db():
            with self.sessions() as session:
                yield session
        app.dependency_overrides[get_db] = db
        self.client = TestClient(app)
        with self.sessions() as db:
            db.add(Patient(id="0417abcd", name="Demo Patient", age=25, gestational_week=22, phone_number="+91 98765 43210"))
            db.commit()
        self.folder = tempfile.TemporaryDirectory(dir="uploads")
        image = io.BytesIO(); Image.new("RGB", (20, 20)).save(image, "PNG")
        self.image = image.getvalue()
        self.extracted = {"visit_date": "2026-09-09", "facility_name": "Demo Clinic", "gestational_week": 22, "pending_items": ["Follow up"], "_confidence": 0.6}
        self.patches = [patch.object(records, "UPLOAD_DIR", self.folder.name), patch.object(records, "extract_text_from_image", return_value="Demo"), patch.object(records, "extract_facts_from_image", return_value=self.extracted)]
        for p in self.patches: p.start()

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.client.close(); self.folder.cleanup(); self.engine.dispose()

    def upload(self, stream=False):
        return self.client.post(f"/api/records/{'upload-stream' if stream else 'upload'}/0417abcd", files={"file": ("demo.png", self.image, "image/png")})

    def test_stream_order_and_same_persistence(self):
        response = self.upload(True)
        self.assertEqual(response.status_code, 200)
        events = [block.splitlines() for block in response.text.strip().split("\n\n")]
        self.assertEqual([e[0] for e in events[:2]], ["event: status"] * 2)
        self.assertEqual(json.loads(events[0][1][6:])["step"], "ocr")
        self.assertEqual(json.loads(events[1][1][6:])["step"], "extract")
        self.assertEqual(events[-1][0], "event: done")
        result = json.loads(events[-1][1][6:])
        with self.sessions() as db:
            self.assertEqual(db.query(Record).count(), 1)
            self.assertEqual(db.get(ExtractedFact, result["fact_id"]).facility_name, "Demo Clinic")

    def test_voice_boost_and_zero_confidence(self):
        result = self.upload().json()
        reply = self.client.post(f"/api/verify/{result['fact_id']}/confirm", json={"source_type": "patient_voice", "value": "Demo Clinic"})
        self.assertAlmostEqual(reply.json()["confidence"], 0.75)
        with self.sessions() as db:
            fact = db.get(ExtractedFact, result["fact_id"])
            self.assertIn("patient_voice", fact.verified_by)
            fact.confidence = 0; db.commit()
        self.assertAlmostEqual(self.client.post(f"/api/verify/{result['fact_id']}/confirm", json={"source_type": "patient_voice"}).json()["confidence"], 0.15)

    def test_stream_failure_saves_no_fact(self):
        with patch.object(records, "extract_facts_from_image", return_value={"_confidence": 0, "_error": "Unreadable"}):
            response = self.upload(True)
        self.assertIn("event: error", response.text)
        self.assertNotIn("event: done", response.text)
        with self.sessions() as db: self.assertEqual(db.query(Record).count(), 0)

    def test_nfc_hardware_errors(self):
        response = self.client.post("/api/esp32/write-nfc", json={"patient_id": "0417abcd", "nfc_writer_ip": "127.0.0.1", "frontend_origin": "http://192.168.1.2:3000"})
        self.assertEqual(response.status_code, 400)
        with patch.object(esp32_bridge, "forward", new=AsyncMock(return_value={"status": "written", "tag_id": "ab"})) as send:
            response = self.client.post("/api/esp32/write-nfc", json={"patient_id": "0417abcd", "nfc_writer_ip": "192.168.1.5", "frontend_origin": "http://192.168.1.2:3000"})
            self.assertEqual(response.json()["status"], "written")
            self.assertEqual(send.call_args.args[2]["url"], "http://192.168.1.2:3000/patient/0417abcd")

    def test_whatsapp_signature_ingestion_and_replay(self):
        form = {"From": "whatsapp:+919876543210", "Body": "P-0417", "MediaUrl0": "https://api.twilio.com/media", "MessageSid": "SM" + "a" * 32}
        url = "http://testserver/api/webhook/whatsapp"
        signature = RequestValidator("test-token").compute_signature(url, form)
        with patch.dict(os.environ, {"CARELINK_ENABLE_WHATSAPP": "1", "TWILIO_AUTH_TOKEN": "test-token", "TWILIO_ACCOUNT_SID": "test-sid", "TWILIO_WEBHOOK_URL": url}), patch.object(whatsapp_webhook, "SessionLocal", self.sessions), patch.object(whatsapp_webhook, "download_image", return_value=(self.image, "image/png")), patch.object(whatsapp_webhook, "send_whatsapp_reply") as reply:
            self.assertEqual(self.client.post(url, data=form).status_code, 403)
            for _ in range(2):
                self.assertEqual(self.client.post(url, data=form, headers={"X-Twilio-Signature": signature}).status_code, 200)
            reply.assert_called_once()
        with self.sessions() as db:
            self.assertEqual(db.query(Record).count(), 1)
            self.assertEqual(db.get(WhatsAppReceipt, form["MessageSid"]).status, "saved")
            self.assertIsNone(whatsapp_webhook.match_patient(db, form["From"], "P-ffff"))
            self.assertEqual(whatsapp_webhook.match_patient(db, form["From"], "").id, "0417abcd")

    def test_phone_migration_is_repeatable(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE patients (id VARCHAR PRIMARY KEY, name VARCHAR)"))
            connection.execute(text("INSERT INTO patients VALUES ('old', 'Existing')"))
        upgrade_patient_phone(engine); upgrade_patient_phone(engine)
        self.assertIn("phone_number", [c["name"] for c in inspect(engine).get_columns("patients")])
        with engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT name FROM patients")).scalar(), "Existing")
        engine.dispose()
