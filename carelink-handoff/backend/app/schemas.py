from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# ----- Patient -----

class PatientCreate(BaseModel):
    name: str
    age: int
    gestational_week: int


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    age: int
    gestational_week: int
    created_at: datetime


# ----- Extracted Fact -----

class FactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    record_id: str
    patient_id: str

    visit_date: Optional[str] = None
    facility_name: Optional[str] = None
    document_type: Optional[str] = None
    gestational_week: Optional[int] = None
    pending_items: Optional[str] = None
    provider_name: Optional[str] = None
    next_appointment: Optional[str] = None

    confidence: float
    status: str
    verified_by: str

    conflict_details: Optional[str] = None
    confidence_notes: Optional[str] = None
    source_image_path: Optional[str] = None


# ----- Journey (what the clinician sees) -----

class JourneyResponse(BaseModel):
    patient: PatientResponse
    facts: List[FactResponse]
    missing_items: List[dict]
    conflicts: List[dict]