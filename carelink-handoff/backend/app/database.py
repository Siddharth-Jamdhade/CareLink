from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# Normalize URL and force psycopg2 driver (not psycopg3) for PostgreSQL URLs
_db_url = DATABASE_URL

if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# check_same_thread is SQLite-only
_connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}

# Create the database engine
engine = create_engine(_db_url, connect_args=_connect_args)

# Create a session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all database models
Base = declarative_base()

def upgrade_record_details(bind):
    """Add nullable transcription fields without changing existing records."""
    columns = {column["name"] for column in inspect(bind).get_columns("extracted_facts")}
    with bind.begin() as connection:
        for name in ("documented_diagnosis", "documented_symptoms", "documented_medications"):
            if name not in columns:
                connection.execute(text(f"ALTER TABLE extracted_facts ADD COLUMN {name} TEXT"))


def get_db():
    """
    Creates a database session for each API request.
    FastAPI calls this automatically.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def upgrade_patient_phone(bind):
    columns = {column["name"] for column in inspect(bind).get_columns("patients")}
    if "phone_number" not in columns:
        with bind.begin() as connection:
            connection.execute(text("ALTER TABLE patients ADD COLUMN phone_number VARCHAR"))


def upgrade_mobile_profile(bind):
    """Idempotent additive migration; existing profiles remain unknown, not inferred."""
    columns = {c["name"] for c in inspect(bind).get_columns("patients")}
    additions = {"emergency_contact": "VARCHAR", "lmp": "VARCHAR", "revised_edd": "VARCHAR",
                 "edd_source": "VARCHAR", "edd_reason": "TEXT", "profile_version": "INTEGER NOT NULL DEFAULT 0"}
    with bind.begin() as connection:
        for name, kind in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE patients ADD COLUMN {name} {kind}"))
