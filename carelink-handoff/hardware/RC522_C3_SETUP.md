# CareLink RC522 + ESP32-C3 SuperMini

This replaces the hardware reader/writer approach in Step 27 for the supplied white card / blue keychain. It reads the UID without changing the tag. The laptop stores UID-to-patient URL mappings and opens the matching page. No ESP32 Wi-Fi credentials are required.

## Wiring (disconnect USB first)

| RC522 label | ESP32-C3 SuperMini label |
| --- | --- |
| 3.3V | 3V3 |
| GND | GND |
| SDA / SS | 7 (GPIO7) |
| SCK | 4 (GPIO4) |
| MOSI | 6 (GPIO6) |
| MISO | 5 (GPIO5) |
| RST | 3 (GPIO3) |
| IRQ | Leave disconnected |

SDA means SPI chip select on this reader, not I2C SDA. Pin numbers are GPIO labels, not physical header positions. Power the RC522 from 3.3V only. Use soldered headers and short wires. Do not use the original guide's GPIO22; ESP32-C3 does not have that GPIO.

## Upload and read a tag

1. Arduino IDE Boards Manager: install **esp32 by Espressif Systems**.
2. Library Manager: install **MFRC522** (GithubCommunity / miguelbalboa).
3. Select **ESP32C3 Dev Module**, **USB CDC On Boot: Enabled**, and the board's COM port.
4. Open `esp32_firmware/carelink_rc522_c3/carelink_rc522_c3.ino` and upload.
5. Open Serial Monitor at **115200** baud. Press RESET if the startup output was missed.
6. Hold one card/keychain close to the RC522 antenna. Expect `UID:XXXXXXXX` and a tag type such as `MIFARE 1KB`. Your UID will differ. Remove the tag before scanning again.

If upload stalls, hold BOOT, press and release RESET, release BOOT, select the port again, and upload. Press RESET after upload. Use a USB data cable. A reader version of 0x00 or 0xFF usually indicates a wiring/power/connection problem; fix and reset. Other clone version values may be valid.

## Open the matching CareLink patient automatically

Keep the CareLink backend and frontend running. Create a demo patient and copy its actual browser URL, e.g. `http://localhost:3000/patient/<actual-id>`. A label such as P-0417 is not necessarily the database ID.

Open PowerShell:

```powershell
cd "C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-handoff\hardware"
python -m pip install pyserial
python carelink_card_bridge.py --list-ports
```

Close Arduino Serial Monitor; only one program can use the port at a time. Substitute your COM port and real patient URL:

```powershell
python carelink_card_bridge.py --port COM5 --enroll "http://localhost:3000/patient/YOUR_ACTUAL_PATIENT_ID"
```

Scan the intended card once. The script saves its mapping to `card_patients.json` beside the script, then exits. Repeat enrollment with another patient URL and card if desired. Re-enrolling the same UID replaces its previous mapping.

Then run:

```powershell
python carelink_card_bridge.py --port COM5
```

Scanning a registered card opens its saved URL in the laptop browser. Unknown cards do not open a patient. Ctrl+C stops the bridge. The board must remain connected by USB. Localhost is correct when the browser and CareLink server are on this laptop; on a phone use the laptop's LAN address instead.

## Difference from the original guide

The white card / blue keychain is commonly MIFARE Classic; confirm the type in Serial Monitor. This workflow is **card -> RC522 -> USB -> laptop -> patient page**. It does not make the card universally phone-tappable and does not write patient information to it. For the guide's phone-tap URL workflow use a compatible NFC Type 2 tag such as NTAG213/215/216 with an NDEF URI record, not the guide's raw URL bytes. A UID identifies a demo record; it is not secure authentication. Use synthetic patient data for this prototype.

References:
- https://github.com/miguelbalboa/rfid
- https://docs.espressif.com/projects/arduino-esp32/en/latest/api/spi.html
- https://docs.espressif.com/projects/arduino-esp32/en/latest/tutorials/cdc_dfu_flash.html

Validation: Python syntax checked. Hardware operation and Arduino compilation have not been verified here.
