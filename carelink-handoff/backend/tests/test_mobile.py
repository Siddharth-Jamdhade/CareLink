"""Isolated synthetic integration checks, including preserved upload/verification workflows."""
import io
import unittest
from datetime import date
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image
from app.database import Base, get_db, upgrade_mobile_profile
from app.models import Patient, Account, Assignment, Record, ExtractedFact, DatingAudit
from app.dating import calculate_edd
from app.security import hash_password, _attempts
from app.main import app
from app.routers import records


class DatingTest(unittest.TestCase):
    def test_calendar_operation_order(self):
        cases = {'2024-05-31': '2025-03-07', '2023-05-31': '2024-03-07',
                 '2024-02-29': '2024-12-06', '2025-01-31': '2025-11-07',
                 '2025-12-31': '2026-10-07', '2026-06-15': '2027-03-22'}
        for lmp, edd in cases.items():
            with self.subTest(lmp=lmp):
                self.assertEqual(calculate_edd(date.fromisoformat(lmp)).isoformat(), edd)
        self.assertNotEqual((calculate_edd(date(2023, 5, 31)) - date(2023, 5, 31)).days, 280)


class MobileIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions() as db:
            db.add_all([Patient(id='one', name='Synthetic One', age=25, gestational_week=20), Patient(id='two', name='Synthetic Two', age=28, gestational_week=20)])
            db.flush()
            for role in ('patient', 'staff', 'clinician'):
                db.add(Account(id=role, username=role, role=role, patient_id='one' if role == 'patient' else None, password_hash=hash_password('Synthetic-test-123')))
                db.add(Assignment(account_id=role, patient_id='one'))
            db.commit()
        def override_db():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = override_db
        self.env = patch.dict('os.environ', {'CARELINK_COOKIE_SECURE': '0'})
        self.env.start()
        _attempts.clear()
        self.client = TestClient(app, headers={'X-CareLink-Client': '1'})

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.env.stop()
        self.engine.dispose()

    def login(self, role='patient'):
        r = self.client.post('/api/auth/login', json={'username': role, 'password': 'Synthetic-test-123'})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn('HttpOnly', r.headers['set-cookie'])

    def test_auth_scope_documents_qr_and_logout(self):
        self.assertEqual(self.client.get('/api/patients/').status_code, 401)
        self.assertEqual(self.client.get('/uploads/one/private.png').status_code, 401)
        self.login()
        self.assertEqual([p['id'] for p in self.client.get('/api/patients/').json()], ['one'])
        for route in ('/api/patients/two', '/api/patients/two/journey', '/api/patients/two/qr', '/api/mobile/two/profile'):
            self.assertEqual(self.client.get(route).status_code, 403, route)
        self.assertEqual(self.client.post('/api/records/upload/two', files={'file': ('x.png', b'x', 'image/png')}).status_code, 403)
        self.assertEqual(self.client.post('/api/verify/unknown/confirm', json={}).status_code, 403)
        self.assertEqual(self.client.post('/api/patients/', json={'name': 'Other'}).status_code, 403)
        self.assertEqual(self.client.delete('/api/patients/one').status_code, 403)
        with self.sessions() as db:
            db.add(Record(id='private-two', patient_id='two', source_image_path='uploads/two/private.png'))
            db.commit()
        self.assertEqual(self.client.get('/api/auth/document/private-two').status_code, 403)
        self.assertEqual(self.client.get('/uploads/two/private.png').status_code, 403)
        self.assertEqual(self.client.get('/api/patients/one/qr').status_code, 200)
        self.assertEqual(self.client.get('/api/mobile/one/profile').headers['cache-control'], 'no-store')
        self.assertEqual(self.client.post('/api/auth/logout').status_code, 200)
        self.assertEqual(self.client.get('/api/mobile/one/profile').status_code, 401)

    def test_profile_persistence_revisions_and_conflict(self):
        self.login()
        initial = self.client.get('/api/mobile/one/profile').json()
        self.assertIsNone(initial['effective_edd'])
        updated = self.client.patch('/api/mobile/one/profile', json={'profile_version': 0, 'lmp': '2026-06-15', 'confirm_old_lmp': True, 'emergency_contact': 'Synthetic contact'}).json()
        self.assertEqual(updated['calculated_edd'], '2027-03-22')
        self.assertEqual(self.client.get('/api/mobile/one/profile').json()['emergency_contact'], 'Synthetic contact')
        self.assertEqual(self.client.patch('/api/mobile/one/profile', json={'profile_version': 0, 'lmp': None}).status_code, 409)
        self.assertEqual(self.client.patch('/api/mobile/one/profile', json={'profile_version': 1, 'lmp': '2099-01-01'}).status_code, 422)
        self.assertEqual(self.client.patch('/api/mobile/one/profile', json={'profile_version': 1, 'lmp': '2020-01-01'}).status_code, 422)
        self.assertEqual(self.client.patch('/api/mobile/one/profile', json={'profile_version': 1, 'revised_edd': '2027-03-20', 'edd_source': 'Synthetic report', 'edd_reason': 'Synthetic revision'}).status_code, 403)
        self.login('clinician')
        revision = self.client.patch('/api/mobile/one/profile', json={'profile_version': 1, 'revised_edd': '2027-03-20', 'edd_source': 'Synthetic report', 'edd_reason': 'Synthetic revision'})
        self.assertEqual(revision.status_code, 200, revision.text)
        self.login()
        changed = self.client.patch('/api/mobile/one/profile', json={'profile_version': 2, 'lmp': '2026-06-16', 'confirm_old_lmp': True}).json()
        self.assertEqual(changed['effective_edd'], '2027-03-20')
        self.assertEqual(changed['calculated_edd'], '2027-03-23')
        with self.sessions() as db:
            self.assertEqual(db.query(DatingAudit).count(), 3)
        history = self.client.get('/api/mobile/one/dating-history').json()
        self.assertEqual(len(history), 3)
        self.assertTrue(any(h['before']['calculated_edd'] == '2027-03-22' for h in history))

    def test_legacy_upload_source_journey_and_verification(self):
        self.login('staff')
        image = io.BytesIO(); Image.new('RGB', (100, 100), 'white').save(image, 'PNG')
        extracted = {'visit_date': '2026-10-01', 'facility_name': 'Synthetic Clinic', 'document_type': 'ANC Card', 'gestational_week': 20, 'pending_items': ['Review report'], '_confidence': 0.85}
        with TemporaryDirectory() as directory, patch.object(records, 'UPLOAD_DIR', directory), patch.object(records.config, 'UPLOAD_DIR', directory), patch.object(records, 'extract_text_from_image', return_value='Synthetic'), patch.object(records, 'extract_facts_from_image', return_value=extracted), patch('app.config.UPLOAD_DIR', directory):
            r = self.client.post('/api/records/upload/one', files={'file': ('synthetic.png', image.getvalue(), 'image/png')})
            self.assertEqual(r.status_code, 200, r.text)
            fact = r.json()['fact_id']; record = r.json()['record_id']
            source = self.client.get(f'/api/auth/document/{record}')
            self.assertEqual(source.status_code, 200)
            self.assertEqual(source.headers['cache-control'], 'no-store')
            with self.sessions() as db:
                stored = db.get(Record, record)
                stored.source_image_path = stored.source_image_path.replace('/', '\\')
                db.commit()
            self.assertEqual(self.client.get('/' + r.json()['source_image']).status_code, 200)
            self.assertEqual(self.client.post(f'/api/verify/{fact}/confirm', json={'source_type': 'health_worker'}).status_code, 200)
            journey = self.client.get('/api/patients/one/journey').json()
            self.assertEqual(journey['facts'][0]['status'], 'verified')
            self.assertEqual(journey['facts'][0]['record_id'], record)
            self.client.post('/api/auth/logout')
            self.assertEqual(self.client.get(f'/api/auth/document/{record}').status_code, 401)

    def test_csrf_header_required(self):
        self.login()
        with TestClient(app, cookies=self.client.cookies) as other:
            self.assertEqual(other.patch('/api/mobile/one/profile', json={'profile_version': 0, 'lmp': None}).status_code, 403)

    def test_migration_idempotent(self):
        from sqlalchemy import inspect, text
        old = create_engine('sqlite://')
        with old.begin() as connection:
            connection.execute(text('CREATE TABLE patients (id VARCHAR PRIMARY KEY, name VARCHAR)'))
            connection.execute(text("INSERT INTO patients VALUES ('old', 'Existing synthetic patient')"))
        upgrade_mobile_profile(old); upgrade_mobile_profile(old)
        self.assertIn('lmp', {c['name'] for c in inspect(old).get_columns('patients')})
        with old.connect() as connection:
            row = connection.execute(text('SELECT name, lmp, profile_version FROM patients')).one()
            self.assertEqual(tuple(row), ('Existing synthetic patient', None, 0))
        old.dispose()


if __name__ == '__main__':
    unittest.main()
