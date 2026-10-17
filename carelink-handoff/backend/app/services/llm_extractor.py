import json
import os

from google import genai
from google.genai import types

from ..config import GEMINI_API_KEY


# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Set GEMINI_MODEL in .env if you need a different supported model
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


EXTRACTION_PROMPT = """
You are a medical record data entry assistant.

You extract ONLY administrative facts from maternal health records.
You NEVER interpret clinical data, diagnose, score risk,
or recommend treatment.

From this record image and its OCR text, extract the following
fields into JSON:

{
  "visit_date": null,
  "facility_name": null,
  "document_type": "Other",
  "gestational_week": null,
  "pending_items": [],
  "provider_name": null,
  "next_appointment": null,
  "confidence_notes": ""
}

Field requirements:
- visit_date: YYYY-MM-DD or null if unclear
- facility_name: hospital, clinic, or centre name, or null
- document_type: one of ANC Card, Prescription, Lab Report,
  Ultrasound Report, Referral Note, Vaccination Record,
  Discharge Summary, Other
- gestational_week: integer or null
- pending_items: list of pending administrative follow-ups,
  tests to obtain, or referrals
- provider_name: doctor or nurse name if visible, or null
- next_appointment: YYYY-MM-DD or null
- confidence_notes: explain anything unclear or hard to read

Rules:
- Only extract information clearly written or printed.
- Do not guess missing information.
- If a field is unreadable or ambiguous, use null and explain why.
- Do NOT extract blood pressure, weight, heart rate,
  lab values, or other clinical measurements.
- Return ONLY valid JSON.
- No explanation before or after the JSON.

OCR Text from this document:
"""


def extract_facts_from_image(image_path: str, ocr_text: str) -> dict:
    """
    Sends an image and OCR text to Gemini.
    Returns extracted administrative facts.
    """

    default_result = {
        "visit_date": None,
        "facility_name": None,
        "document_type": "Other",
        "gestational_week": None,
        "pending_items": [],
        "provider_name": None,
        "next_appointment": None,
        "confidence_notes": "",
        "_confidence": 0.0,
    }

    if client is None:
        return {
            **default_result,
            "confidence_notes": "Gemini API key is not configured",
        }

    try:
        # Read image
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        # Determine image type
        if image_path.lower().endswith(".png"):
            mime = "image/png"
        else:
            mime = "image/jpeg"

        # Build prompt
        full_prompt = EXTRACTION_PROMPT + ocr_text

        # Call Gemini
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime
                ),
                types.Part.from_text(
                    text=full_prompt
                ),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            ),
        )

        # Parse JSON
        response_text = (response.text or "").strip()

        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            response_text = response_text.rsplit("```", 1)[0]

        result = json.loads(response_text)

        # Calculate confidence
        confidence = calculate_confidence(result, ocr_text)
        result["_confidence"] = confidence

        return result

    except json.JSONDecodeError:
        return {
            **default_result,
            "confidence_notes": "Failed to parse AI response",
        }

    except Exception as e:
        return {
            **default_result,
            "confidence_notes": f"Extraction error: {str(e)}",
        }


def calculate_confidence(result: dict, ocr_text: str) -> float:
    """
    Calculates a simple heuristic completeness score.
    This is not a calibrated measure of medical accuracy.
    """

    score = 0.5

    fields = [
        "visit_date",
        "facility_name",
        "document_type",
        "gestational_week",
    ]

    for field in fields:
        if result.get(field) is not None:
            score += 0.1

    facility = result.get("facility_name")

    if isinstance(facility, str) and facility.lower() in ocr_text.lower():
        score += 0.05

    notes = result.get("confidence_notes") or ""

    if isinstance(notes, str) and notes != "null" and len(notes) > 5:
        score -= 0.15

    return max(0.1, min(0.98, round(score, 2)))