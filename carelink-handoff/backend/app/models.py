import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gestational_week = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    records = relationship("Record", back_populates="patient")
    facts = relationship("ExtractedFact", back_populates="patient")


class Record(Base):
    __tablename__ = "records"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    source_image_path = Column(String, nullable=False)
    original_filename = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="records")
    facts = relationship("ExtractedFact", back_populates="record")


class ExtractedFact(Base):
    __tablename__ = "extracted_facts"

    id = Column(String, primary_key=True, default=generate_uuid)
    record_id = Column(String, ForeignKey("records.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)

    visit_date = Column(String, nullable=True)
    facility_name = Column(String, nullable=True)
    document_type = Column(String, nullable=True)
    gestational_week = Column(Integer, nullable=True)
    pending_items = Column(Text, nullable=True)
    provider_name = Column(String, nullable=True)
    next_appointment = Column(String, nullable=True)

    confidence = Column(Float, default=0.0)
    status = Column(String, default="unverified")
    verified_by = Column(Text, default='["document"]')
    conflict_details = Column(Text, nullable=True)
    confidence_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    record = relationship("Record", back_populates="facts")
    patient = relationship("Patient", back_populates="facts")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    fact_id = Column(String, ForeignKey("extracted_facts.id"), nullable=False)
    source_type = Column(String, nullable=False)
    value = Column(String)
    verified_at = Column(DateTime, default=datetime.utcnow)