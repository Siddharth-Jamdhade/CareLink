"""Existing regression scenarios now execute as assigned synthetic staff."""
import secrets
from datetime import datetime, timedelta
from fastapi.testclient import TestClient as BaseClient
from app.database import get_db
from app.models import Account, Assignment, Patient, LoginSession
from app.security import digest, hash_password


class TestClient(BaseClient):
    def request(self, *args, **kwargs):
        provider = self.app.dependency_overrides.get(get_db)
        if not provider:
            raise RuntimeError('Regression tests must use an isolated database override')
        generator = provider()
        db = next(generator)
        try:
            account = db.get(Account, 'regression-staff')
            if not account:
                account = Account(id='regression-staff', username='regression-staff', role='staff', password_hash=hash_password(secrets.token_hex(20)))
                db.add(account)
                db.flush()
            for p in db.query(Patient):
                if not db.get(Assignment, (account.id, p.id)):
                    db.add(Assignment(account_id=account.id, patient_id=p.id))
            token = secrets.token_urlsafe(32)
            db.add(LoginSession(token_hash=digest(token), account_id=account.id, expires_at=datetime.utcnow() + timedelta(hours=1)))
            db.commit()
            self.cookies.set('carelink_session', token)
        finally:
            generator.close()
        kwargs['headers'] = {**(kwargs.get('headers') or {}), 'X-CareLink-Client': '1'}
        return super().request(*args, **kwargs)
