import json
import os
from typing import List

from ..models import ExtractedFact


# Load the protocol file
PROTOCOL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "data",
    "anc_protocol.json"
)

with open(PROTOCOL_PATH, "r", encoding="utf-8") as f:
    ANC_PROTOCOL = json.load(f)


def check_protocol_gaps(
    gestational_week: int,
    existing_facts: List[ExtractedFact]
) -> List[dict]:
    """
    Compares documented records against the prototype ANC checklist.

    Returns possible missing visits and checklist items.

    These are documentation gaps, not confirmed gaps in care.
    """

    missing = []

    # Collect available text from existing facts
    all_text = ""

    for fact in existing_facts:
        all_text += (
            f" {fact.document_type or ''}"
            f" {fact.pending_items or ''}"
            f" {fact.facility_name or ''}"
        )

    all_text = all_text.lower()

    # Count records containing a visit date
    visit_count = len([
        fact for fact in existing_facts
        if fact.visit_date
    ])

    for visit in ANC_PROTOCOL["visits"]:

        # Only check milestones reached by the current week
        if gestational_week >= visit["expected_by_week"]:

            # Check whether enough dated records exist
            if visit["visit_number"] > visit_count:
                missing.append({
                    "type": "missing_visit",
                    "label": visit["label"],
                    "expected_by_week": visit["expected_by_week"],
                    "message": (
                        f"{visit['label']} — expected by Week "
                        f"{visit['expected_by_week']}, "
                        f"no corresponding visit confirmed in records"
                    )
                })

            # Check for required item names in extracted text
            for item in visit["required_items"]:

                if item.lower() not in all_text:
                    missing.append({
                        "type": "missing_item",
                        "label": item,
                        "expected_by_week": visit["expected_by_week"],
                        "message": (
                            f"{item} — expected by Week "
                            f"{visit['expected_by_week']}, "
                            f"not found in extracted records"
                        )
                    })

    return missing