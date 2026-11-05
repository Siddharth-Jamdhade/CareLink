"""Start the shared cloud service with durable storage and same-origin sessions."""
import os
from pathlib import Path
from urllib.parse import urlsplit


def public_origin(value):
    url = urlsplit(value)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment:
        raise ValueError('Configure CARELINK_PUBLIC_ORIGIN as your HTTPS origin, or deploy on Render.')
    return value.rstrip('/')


def main():
    origin = public_origin(os.getenv('CARELINK_PUBLIC_ORIGIN') or os.getenv('RENDER_EXTERNAL_URL', ''))
    os.environ['FRONTEND_URL'] = origin
    os.environ['CARELINK_ALLOWED_ORIGINS'] = origin
    os.environ['CARELINK_COOKIE_SECURE'] = '1'
    os.environ['CARELINK_CLOUD_MODE'] = '1'
    os.environ.setdefault('CARELINK_DATABASE_URL', 'sqlite:////var/data/carelink.db')
    os.environ.setdefault('CARELINK_UPLOAD_DIR', '/var/data/uploads')
    root = Path('/var/data')
    root.mkdir(parents=True, exist_ok=True)
    uploads = Path(os.environ['CARELINK_UPLOAD_DIR'])
    uploads.mkdir(parents=True, exist_ok=True)
    # Initialise the mounted directories, then run the API without root privileges.
    if hasattr(os, 'geteuid') and os.geteuid() == 0:
        try:
            os.chown(root, 10001, 10001)
            os.chown(uploads, 10001, 10001)
            os.setgroups([])
            os.setgid(10001)
            os.setuid(10001)
            os.environ['HOME'] = '/home/carelink'
        except Exception:
            pass
    os.execvp('uvicorn', ['uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', os.getenv('PORT', '10000'), '--workers', '1', '--no-access-log'])


if __name__ == '__main__':
    main()
