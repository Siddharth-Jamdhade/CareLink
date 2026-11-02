# CareLink phone-tap wristband writer

Open `esp32_firmware/carelink_nfc_writer_c3/carelink_nfc_writer_c3.ino` in Arduino IDE. This implements Step 27 of the prototype guide with the supplied ESP32-C3 SuperMini wiring and a phone-readable NDEF URI record. Writing replaces existing tag content.

| RC522 | ESP32-C3 |
| --- | --- |
| 3.3V | 3V3 |
| GND | GND |
| SDA / SS | GPIO7 |
| SCK | GPIO4 |
| MOSI | GPIO6 |
| MISO | GPIO5 |
| RST | GPIO3 |
| IRQ | Unconnected |

1. Boards Manager: install **esp32 by Espressif Systems**. Library Manager: install **MFRC522** by GithubCommunity.
2. Select **ESP32C3 Dev Module**, **USB CDC On Boot: Enabled**, and the board's COM port.
3. Edit `PATIENT_URL` with the actual patient database ID and a URL your phone can open. Example: `http://192.168.1.20:8000/patient/<actual-patient-id>`. Replace the entire example with your own values. The sketch refuses to run while `YOUR_` placeholders remain.
4. Upload, open Serial Monitor at **115200**, and press RESET if needed.
5. Hold one writable **NTAG213/215/216** wristband still against the reader until the success message. Remove it and tap with an NFC-enabled phone; follow the phone's NFC notification.

The writer needs no Wi-Fi connection: it stores a URL, and the phone opens that URL. The patient records stay in CareLink. The writer limits data to the first 144 user bytes, supports URLs up to 136 bytes, checks the capability container and static locks, checks every write result and verifies written pages. It leaves UID, lock, capability-container and configuration pages untouched. Interrupted writes can leave an empty or incomplete NDEF record; rerun with the tag held still. Password-protected tags may reject writes.

## Make the patient URL reachable

For the existing single-server setup, build `frontend/carelink-app` with `npm run build`, then run the backend from its folder with:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use `ipconfig` to find the laptop's Wi-Fi IPv4 address. Connect phone and laptop to the same Wi-Fi and first open the exact patient URL manually on the phone. Allow the server through Windows Firewall on your private network if needed. `localhost` on the phone refers to the phone. An alternative is a reachable frontend URL on port 3000, provided its backend routing also works from the phone. Use synthetic patient records for this demo.

## If you have the white card or blue keychain supplied with RC522

These are often MIFARE Classic. Check the reported tag type. This writer refuses Classic cards; use `esp32_firmware/carelink_rc522_c3/carelink_rc522_c3.ino` and the existing `carelink_card_bridge.py` workflow documented in `RC522_C3_SETUP.md` to open the matching patient on the laptop. For the guide's phone-tap workflow, obtain a supported NTAG wristband.

## Troubleshooting

- `0x00` / `0xFF` reader version: check 3.3V power, common ground, GPIO labels, solder joints and short wires.
- Upload stalls: hold BOOT, press/release RESET, release BOOT, reselect the COM port and upload; press RESET afterward.
- Unsupported/protected tag: use a writable standard NTAG213/215/216. Do not try changing lock bits.
- Phone reads URL but page fails: fix server/network reachability using a manual browser check.

References: [MFRC522 library](https://github.com/miguelbalboa/rfid), [Espressif USB CDC setup](https://docs.espressif.com/projects/arduino-esp32/en/latest/tutorials/cdc_dfu_flash.html), [NXP NTAG213/215/216](https://www.nxp.com/products/NTAG213_215_216).
