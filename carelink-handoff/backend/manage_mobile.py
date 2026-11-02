"""Local provisioning only: python manage_mobile.py --help. Never exposes registration."""
import argparse
import getpass
from app.database import Base, engine, SessionLocal, upgrade_mobile_profile
from app.models import Account, Assignment, Patient
from app.security import hash_password

parser = argparse.ArgumentParser()
parser.add_argument("username")
parser.add_argument("--role", choices=["patient", "staff", "clinician"], required=True)
parser.add_argument("--patient", action="append", default=[], help="Existing patient ID; repeat for staff assignments")
parser.add_argument("--synthetic", action="store_true", help="Create a clearly labelled synthetic patient")
parser.add_argument("--assign-only", action="store_true", help="Add assignments to an existing staff/clinician account")
parser.add_argument("--revoke", action="store_true", help="With --assign-only, remove the specified staff assignments")
args = parser.parse_args()
password = getpass.getpass("New password (12+ characters): ") if not args.assign_only else None
if not args.assign_only and len(password) < 12:
    parser.error("Use at least 12 characters")
if args.revoke and not args.assign_only:
    parser.error("--revoke requires --assign-only")
Base.metadata.create_all(engine)
upgrade_mobile_profile(engine)
with SessionLocal() as db:
    if args.assign_only:
        account = db.query(Account).filter_by(username=args.username).first()
        if not account or account.role not in ('staff', 'clinician') or account.role != args.role:
            parser.error("Choose an existing staff/clinician account with the matching role")
        if not args.patient or any(db.get(Patient, pid) is None for pid in args.patient):
            parser.error("Provide existing --patient IDs")
        for pid in args.patient:
            assignment = db.get(Assignment, (account.id, pid))
            if args.revoke and assignment:
                db.delete(assignment)
            elif not args.revoke and not assignment:
                db.add(Assignment(account_id=account.id, patient_id=pid))
        db.commit()
        print("Staff assignments updated. QR links do not bypass these assignments.")
        raise SystemExit(0)
    if args.synthetic:
        p = Patient(name="Synthetic · Asha Demo", age=28)
        db.add(p)
        db.flush()
        args.patient.append(p.id)
    if args.role == "patient" and len(args.patient) != 1:
        parser.error("Patient accounts require exactly one --patient or --synthetic")
    if any(db.get(Patient, pid) is None for pid in args.patient):
        parser.error("Unknown patient assignment")
    if db.query(Account).filter_by(username=args.username).first():
        parser.error("Username already exists")
    account = Account(username=args.username, password_hash=hash_password(password), role=args.role,
                      patient_id=args.patient[0] if args.role == "patient" else None)
    db.add(account)
    db.flush()
    for pid in args.patient:
        db.add(Assignment(account_id=account.id, patient_id=pid))
    db.commit()
print("Account provisioned. No existing patient data changed.")
