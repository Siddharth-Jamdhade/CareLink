import os
from urllib.parse import urlsplit
from fastapi import HTTPException


def journey_url(patient_id, origin=None):
    origin = origin or os.getenv("FRONTEND_URL", "http://localhost:3000")
    parsed = urlsplit(origin)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise HTTPException(400, "Invalid frontend origin")
    return f"{origin.rstrip('/')}/patient/{patient_id}"
