from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


# ----- Patient -----

class PatientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)
    age: int | None = Field(default=None, ge=0, le=120)
    gestational_week: int | None = Field(default=None, ge=0, le=45)
    phone_number: str | None = Field(default=None, max_length=40)


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    age: int | None = None
    gestational_week: int | None = None
    phone_number: str | None = None
    created_at: datetime
    record_count: int = 0
    conflict_count: int = 0
    pending_count: int = 0


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
    documented_diagnosis: Optional[str] = None
    documented_symptoms: Optional[str] = None
    documented_medications: Optional[str] = None

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
