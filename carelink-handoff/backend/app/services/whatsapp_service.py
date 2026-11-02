import os
from urllib.parse import urlsplit
import requests


def send_whatsapp_reply(to: str, body: str):
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        auth=(sid, os.environ["TWILIO_AUTH_TOKEN"]),
        data={"To": to, "From": os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"), "Body": body},
        timeout=20,
    )
    response.raise_for_status()


def download_image(url: str):
    """Bounded authenticated Twilio media fetch; never forward credentials on redirects."""
    from ..routers.records import MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    for hop in range(4):
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        twilio = host == "api.twilio.com" or host.endswith(".twilio.com")
        storage = host.endswith(".amazonaws.com")
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443) or not (twilio or (hop > 0 and storage)):
            raise ValueError("Invalid Twilio media URL")
        with requests.get(url, auth=(sid, token) if twilio else None, timeout=25, stream=True, allow_redirects=False) as response:
            if response.is_redirect:
                from urllib.parse import urljoin
                url = urljoin(url, response.headers["Location"])
                continue
            response.raise_for_status()
            mime = response.headers.get("Content-Type", "").split(";")[0].strip()
            if mime not in ALLOWED_IMAGE_TYPES:
                raise ValueError("Send a JPEG or PNG image")
            data = bytearray()
            for chunk in response.iter_content(65536):
                data.extend(chunk)
                if len(data) > MAX_UPLOAD_SIZE:
                    raise ValueError("Image must be 10 MB or smaller")
            return bytes(data), mime
    raise ValueError("Too many media redirects")
