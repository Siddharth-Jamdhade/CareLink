"""Open a mapped CareLink patient page when its card is scanned over USB."""
import argparse
import json
import re
import time
import webbrowser
from pathlib import Path
from urllib.parse import urlparse

import serial
from serial.tools import list_ports


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', help='ESP32 serial port, e.g. COM5')
    parser.add_argument('--list-ports', action='store_true')
    parser.add_argument('--enroll', metavar='PATIENT_URL', help='Link the next card scanned to this URL')
    args = parser.parse_args()
    if args.list_ports:
        for port in list_ports.comports():
            print(f'{port.device}: {port.description}')
        return
    if not args.port:
        parser.error('Specify --port COM5, or use --list-ports first.')
    if args.enroll:
        parsed = urlparse(args.enroll)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or not parsed.path.startswith('/patient/'):
            parser.error('--enroll needs a full http(s) CareLink /patient/ID URL.')
    mapping_file = Path(__file__).with_name('card_patients.json')
    mapping = json.loads(mapping_file.read_text(encoding='utf-8')) if mapping_file.exists() else {}
    if not isinstance(mapping, dict):
        raise ValueError('card_patients.json must contain a JSON object.')
    last_uid, last_opened = '', 0.0
    print('Close Arduino Serial Monitor before running this script.')
    print('Scan a card to ' + ('save its patient link.' if args.enroll else 'open its patient page. Ctrl+C stops.'))
    with serial.Serial(args.port, 115200, timeout=1) as connection:
        while True:
            line = connection.readline().decode('utf-8', errors='replace').strip()
            if not line.startswith('UID:'):
                if line:
                    print(line)
                continue
            uid = line[4:].strip().upper()
            if not re.fullmatch(r'(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})', uid):
                continue
            if args.enroll:
                mapping[uid] = args.enroll
                temporary = mapping_file.with_suffix('.tmp')
                temporary.write_text(json.dumps(mapping, indent=2) + '\n', encoding='utf-8')
                temporary.replace(mapping_file)
                print(f'Linked {uid} -> {args.enroll}')
                return
            url = mapping.get(uid)
            if not url:
                print(f'Unregistered card {uid}. Run with --enroll PATIENT_URL first.')
                continue
            parsed = urlparse(url)
            if parsed.scheme not in ('http', 'https') or not parsed.hostname:
                print(f'Invalid saved URL for {uid}; enroll again.')
                continue
            now = time.monotonic()
            if uid == last_uid and now - last_opened < 3:
                continue
            last_uid, last_opened = uid, now
            print(f'Opening {uid} -> {url}')
            if not webbrowser.open(url, new=2):
                print('Browser could not be opened automatically. Open the URL above manually.')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nStopped.')
    except (serial.SerialException, OSError, ValueError) as exc:
        raise SystemExit(f'Error: {exc}')
