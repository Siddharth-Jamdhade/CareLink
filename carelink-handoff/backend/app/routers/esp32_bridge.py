import ipaddress
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Patient
from ..security import current_account, require_patient
from ..services.journey_links import journey_url

router = APIRouter()


class NFCRequest(BaseModel):
    patient_id: str
    nfc_writer_ip: str
    frontend_origin: str


def device_url(address, path):
    try:
        ip = ipaddress.IPv4Address(address)
    except ValueError:
        raise HTTPException(400, "Enter the ESP32 IPv4 address without a port or URL")
    networks = ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
    if not any(ip in ipaddress.ip_network(network) for network in networks):
        raise HTTPException(400, "ESP32 must use a private LAN IPv4 address")
    return f"http://{ip}/{path}"


async def forward(address, path, payload):
    url = device_url(address, path)
    try:
        async with httpx.AsyncClient(timeout=20, trust_env=False) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, dict) or result.get("status") != "written":
                raise HTTPException(502, "No wristband detected within 10 seconds" if isinstance(result, dict) and result.get("status") == "timeout" else "ESP32 did not complete the operation")
            return result
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "ESP32 unavailable or operation failed. Check its IP, Wi-Fi and wiring.")


@router.post("/write-nfc")
async def write_nfc(req: NFCRequest, db: Session = Depends(get_db), account=Depends(current_account)):
    if account.role not in ("staff", "clinician"):
        raise HTTPException(403, "Assigned staff account required")
    require_patient(account, req.patient_id, db)
    if os.getenv('CARELINK_CLOUD_MODE') == '1':
        raise HTTPException(503, 'Use the cloud NFC link with a nearby band writer. The cloud server cannot reach a private LAN ESP32.')
    if db.get(Patient, req.patient_id) is None:
        raise HTTPException(404, "Patient not found")
    return await forward(req.nfc_writer_ip, "write", {"url": journey_url(req.patient_id, req.frontend_origin)})
