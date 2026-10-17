from datetime import datetime, timedelta
from typing import List
from ..models import ExtractedFact


def detect_conflicts(new_fact_data: dict, existing_facts: List[ExtractedFact]) -> List[dict]:
    """
    Compares a newly extracted fact against all existing facts for the same patient.
    Returns a list of conflict descriptions.
    """
    conflicts = []

    new_date = parse_date(new_fact_data.get("visit_date"))
    new_facility = (new_fact_data.get("facility_name") or "").lower()
    new_doc_type = (new_fact_data.get("document_type") or "").lower()
    new_week = new_fact_data.get("gestational_week")

    for existing in existing_facts:
        ex_date = parse_date(existing.visit_date)
        ex_facility = (existing.facility_name or "").lower()
        ex_doc_type = (existing.document_type or "").lower()
        ex_week = existing.gestational_week

        # Rule 1: Date collision — same dates but different facilities
        if new_date and ex_date:
            day_diff = abs((new_date - ex_date).days)
            if day_diff <= 2 and new_facility != ex_facility and new_facility and ex_facility:
                conflicts.append({
                    "type": "date_collision",
                    "message": f"Visit on {new_fact_data['visit_date']} at '{new_fact_data['facility_name']}' "
                               f"is within 2 days of visit on {existing.visit_date} at '{existing.facility_name}'",
                    "existing_fact_id": existing.id,
                })

        # Rule 2: Gestational week goes backwards
        if new_week and ex_week and new_date and ex_date:
            if new_date > ex_date and new_week < ex_week:
                conflicts.append({
                    "type": "week_mismatch",
                    "message": f"Gestational week went from {ex_week} to {new_week} "
                               f"between {existing.visit_date} and {new_fact_data['visit_date']} — weeks should increase",
                    "existing_fact_id": existing.id,
                })

        # Rule 3: Duplicate document
        if (new_doc_type == ex_doc_type
                and new_facility == ex_facility
                and new_date and ex_date
                and abs((new_date - ex_date).days) <= 3):
            conflicts.append({
                "type": "possible_duplicate",
                "message": f"Possible duplicate: same document type '{new_fact_data['document_type']}' "
                           f"from same facility within 3 days",
                "existing_fact_id": existing.id,
            })

    return conflicts


def parse_date(date_str):
    """Safely parse a date string."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None
