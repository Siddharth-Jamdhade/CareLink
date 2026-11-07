"""RAG policy and authenticated workflow tests; no live API or real patient data."""
import json
import unittest
from unittest.mock import patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.models import Account, Assignment, Patient, RagCase, RagEntry
from app.security import current_account
from app.routers import rag
from rag_knowledge import danger_signs, feedback_document, form_from_input, query_text, build_documents

class RagTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.staff = Account(id='staff', username='qa-staff', password_hash='unused', role='staff')
        self.doctor = Account(id='doctor', username='qa-doctor', password_hash='unused', role='clinician')
        self.db.add_all([self.staff, self.doctor, Patient(id='p', name='Fictional QA patient')])
        self.db.flush()
        self.db.add_all([Assignment(account_id='staff', patient_id='p'), Assignment(account_id='doctor', patient_id='p')])
        self.db.commit()
        self.account = self.staff
        app = FastAPI()
        app.include_router(rag.router, prefix='/api')
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[current_account] = lambda: self.account
        self.client = TestClient(app)
        self.input = {'patient_id': 'p', 'gestational_week': 22, 'trimester': 2, 'chief_complaint': 'Routine check', 'vitals': {'bp': '120/80', 'weight': 60, 'pulse': 80}, 'symptoms': []}

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def draft(self, route=False):
        result = {'pre_filled_form': form_from_input(self.input), 'confidence_score': 40 if route else 85, 'route_to_doctor': route, 'flag_for_doctor': route, 'danger_signs_detected': [], 'sources': [], 'reasoning': 'QA retrieval', 'matched_template': 'ANC-T2-ROUTINE'}
        with patch.object(rag, 'get_rag_suggestion', AsyncMock(return_value=result)):
            response = self.client.post('/api/rag/suggest', json=self.input)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_routine_confirmation_uses_server_case_and_is_idempotent(self):
        draft = self.draft()
        payload = {'case_id': draft['case_id'], 'patient_id': 'p', 'confirmed_form': draft['pre_filled_form'], 'original_confidence': 1}
        one = self.client.post('/api/rag/confirm', json=payload)
        two = self.client.post('/api/rag/confirm', json=payload)
        self.assertEqual(one.status_code, 200, one.text)
        self.assertEqual(one.json()['record_id'], two.json()['record_id'])
        self.assertEqual(self.db.query(RagEntry).count(), 1)

    def test_nurse_cannot_bypass_server_review_flag(self):
        draft = self.draft(True)
        result = self.client.post('/api/rag/confirm', json={'case_id': draft['case_id'], 'patient_id': 'p', 'confirmed_form': draft['pre_filled_form'], 'original_confidence': 100})
        self.assertEqual(result.status_code, 409)
        self.assertEqual(self.db.query(RagEntry).count(), 0)

    def test_edited_diagnosis_requires_doctor_and_staff_cannot_approve(self):
        draft = self.draft()
        draft['pre_filled_form']['documented_diagnosis'] = 'Documented condition'
        result = self.client.post('/api/rag/confirm', json={'case_id': draft['case_id'], 'patient_id': 'p', 'confirmed_form': draft['pre_filled_form']})
        self.assertEqual(result.status_code, 409)
        self.assertEqual(self.client.post('/api/doctor/verify', json={'case_id': draft['case_id'], 'action': 'APPROVE'}).status_code, 403)

    def test_doctor_approval_and_feedback_are_idempotent(self):
        draft = self.draft(True)
        self.account = self.doctor
        self.assertEqual(len(self.client.post('/api/doctor/verification-queue').json()['cases']), 1)
        with patch.object(rag, 'add_verified_case_to_kb', AsyncMock(return_value={})) as feedback:
            first = self.client.post('/api/doctor/verify', json={'case_id': draft['case_id'], 'action': 'APPROVE'})
            second = self.client.post('/api/doctor/verify', json={'case_id': draft['case_id'], 'action': 'APPROVE'})
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(feedback.await_count, 1)
        self.assertEqual(self.db.query(RagEntry).count(), 1)

    def test_wrong_patient_is_rejected(self):
        draft = self.draft()
        result = self.client.post('/api/rag/confirm', json={'case_id': draft['case_id'], 'patient_id': 'other', 'confirmed_form': draft['pre_filled_form']})
        self.assertEqual(result.status_code, 403)

    def test_missing_sarvam_is_explicit(self):
        with patch.dict('os.environ', {'SARVAM_API_KEY': ''}):
            result = self.client.post('/api/sarvam/transcribe', files={'file': ('test.webm', b'qa', 'audio/webm')})
        self.assertEqual(result.status_code, 503)
        self.assertIn('Voice input unavailable', result.text)

    def test_policy_does_not_invent_findings_or_learn_patient_values(self):
        data = {**self.input, 'patient_name': 'Private Name', 'phone': '9999999999'}
        self.assertNotIn('Private Name', query_text(data))
        form = form_from_input(data)
        self.assertEqual(form['documented_diagnosis'], '')
        self.assertEqual(form['documented_medications'], '')
        form['observations'] = 'Private Name 9999999999'
        self.assertNotIn('Private Name', json.dumps(feedback_document('case', form)))

    def test_warning_routing_and_negation(self):
        self.assertTrue(danger_signs({**self.input, 'chief_complaint': 'Heavy vaginal bleeding'}))
        self.assertFalse(danger_signs({**self.input, 'chief_complaint': 'No bleeding'}))
        self.assertTrue(danger_signs({**self.input, 'chief_complaint': 'No fetal movements'}))
        self.assertTrue(danger_signs({**self.input, 'vitals': {'bp': '160/110'}}))

    def test_index_includes_all_reference_groups(self):
        docs = build_documents()
        self.assertEqual(len(docs), 38)
        self.assertTrue(any(d['metadata']['group'] == 'danger_signs_checklist' for d in docs))
        self.assertTrue(all(d['metadata']['source_review_status'] == 'unreviewed' for d in docs))

if __name__ == '__main__':
    unittest.main()
