"""Local API checks using an isolated database and mocked external extraction."""
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from tests.authorized_client import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
sys.modules["app.services.ocr_service"] = MagicMock()
try:
    from app.main import app
    from app.routers import records, patients
    from app.models import Patient, Record, ExtractedFact, Verification
finally:
    sys.modules.pop("app.services.ocr_service", None)


class Phase123Test(unittest.TestCase):
    def test_patient_record_journey_verification_and_qr(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        sessions = sessionmaker(bind=engine)

        def test_db():
            with sessions() as session:
                yield session

        app.dependency_overrides[get_db] = test_db
        try:
            with tempfile.TemporaryDirectory(dir="uploads") as directory, TestClient(app) as client:
                self.assertEqual(client.get("/").status_code, 200)
                self.assertEqual(client.get("/api/patients/missing/journey").status_code, 403)
                response = client.post("/api/patients/", json={"name": "Synthetic Test", "age": 25, "gestational_week": 28})
                self.assertEqual(response.status_code, 200)
                patient_id = response.json()["id"]
                self.assertEqual(len(client.get("/api/patients/").json()), 1)
                self.assertTrue(client.get(f"/api/patients/{patient_id}/journey").json()["missing_items"])
                image = io.BytesIO()
                Image.new("RGB", (100, 100), "white").save(image, "PNG")
                extracted = {"visit_date": "2026-10-01", "facility_name": "Test Clinic", "document_type": "ANC Card", "gestational_week": 26, "pending_items": ["Follow-up visit"], "_confidence": 0.85}
                extracted.update(provider_name="Dr. Demo", documented_diagnosis="Rule out anaemia", documented_symptoms="Fatigue", documented_medications="As written in synthetic record")
                with patch.object(records, "UPLOAD_DIR", directory), patch.object(records, "extract_text_from_image", return_value="Test Clinic"), patch.object(records, "extract_facts_from_image", return_value=extracted):
                    upload = client.post(f"/api/records/upload/{patient_id}", files={"file": ("synthetic.png", image.getvalue(), "image/png")})
                    self.assertEqual(upload.status_code, 200, upload.text)
                    fact_id = upload.json()["fact_id"]
                    journey = client.get(f"/api/patients/{patient_id}/journey").json()
                    self.assertEqual(len(journey["facts"]), 1)
                    self.assertEqual(journey["facts"][0]["provider_name"], "Dr. Demo")
                    self.assertEqual(journey["facts"][0]["documented_diagnosis"], "Rule out anaemia")
                    self.assertEqual(journey["facts"][0]["documented_symptoms"], "Fatigue")
                    self.assertEqual(journey["facts"][0]["documented_medications"], "As written in synthetic record")
                    source = journey["facts"][0]["source_image_path"]
                    self.assertNotIn("\\", source, "Source image must use URL slashes on Windows")
                    self.assertEqual(client.get("/" + source).status_code, 200)
                    duplicate = client.post(f"/api/records/upload/{patient_id}", files={"file": ("synthetic.png", image.getvalue(), "image/png")})
                    self.assertEqual(duplicate.json()["status"], "conflict")
                    self.assertEqual(client.post(f"/api/verify/{fact_id}/confirm", json={"source_type": "health_worker", "value": "confirmed"}).status_code, 200)
                    self.assertEqual(client.get(f"/api/patients/{patient_id}/journey").json()["facts"][0]["status"], "verified")
                    qr = client.get(f"/api/patients/{patient_id}/qr")
                    self.assertEqual(qr.headers["content-type"], "image/png")
                    self.assertTrue(qr.content.startswith(b"\x89PNG"))
                    invalid = client.post(f"/api/records/upload/{patient_id}", files={"file": ("bad.txt", b"text", "text/plain")})
                    self.assertEqual(invalid.status_code, 400)
                    summary = client.get("/api/patients/").json()[0]
                    self.assertEqual(summary["record_count"], 2)
                    self.assertEqual(summary["conflict_count"], 1)
                    before_files = set(Path(directory).rglob("*"))
                    with patch.object(records, "extract_facts_from_image", return_value={"_confidence": 0, "_error": "AI quota reached."}):
                        failed = client.post(f"/api/records/upload/{patient_id}", files={"file": ("failed.png", image.getvalue(), "image/png")})
                    self.assertEqual(failed.status_code, 502)
                    self.assertEqual(failed.json()["detail"], "AI quota reached.")
                    self.assertEqual(set(Path(directory).rglob("*")), before_files)
                    self.assertEqual(client.get("/api/patients/").json()[0]["record_count"], 2)
                    with patch.object(patients.qrcode, "make", wraps=patients.qrcode.make) as make:
                        client.get(f"/api/patients/{patient_id}/qr?frontend_origin=http://192.168.1.20:3000")
                        make.assert_called_once_with(f"http://192.168.1.20:3000/patient/{patient_id}")
                    self.assertEqual(client.get(f"/api/patients/{patient_id}/qr?frontend_origin=javascript:bad").status_code, 400)
                    self.assertEqual(client.post(f"/api/verify/{duplicate.json()['fact_id']}/resolve-conflict").status_code, 200)
                    self.assertEqual(client.get(f"/api/patients/{patient_id}/journey").json()["conflicts"], [])
                    self.assertEqual(client.delete(f"/api/patients/{patient_id}").status_code, 204)
                    self.assertEqual(client.get(f"/api/patients/{patient_id}/journey").status_code, 404)
                    self.assertEqual(client.get("/" + source).status_code, 404)
                    self.assertEqual(client.delete(f"/api/patients/{patient_id}").status_code, 404)
                    with sessions() as db:
                        for model in (Patient, Record, ExtractedFact, Verification):
                            self.assertEqual(db.query(model).count(), 0)
                cors = client.options("/api/patients/", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "DELETE"})
                self.assertEqual(cors.headers["access-control-allow-origin"], "http://localhost:3000")
                denied = client.options("/api/patients/", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "DELETE"})
                self.assertNotIn("access-control-allow-origin", denied.headers)
                self.assertEqual(client.get("/api/health").status_code, 200)
                self.assertEqual(client.get("/api/unknown").status_code, 404)
                self.assertEqual(client.get("/settings").status_code, 200)
                self.assertIn("CareLink", client.get("/settings").text)
                self.assertEqual(client.get("/service-worker.js").status_code, 200)

        finally:
            app.dependency_overrides.clear()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
