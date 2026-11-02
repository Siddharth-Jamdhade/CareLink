// CareLink Step 27: ESP32-C3 SuperMini + RC522 NDEF URL writer.
// Board: ESP32C3 Dev Module; USB CDC On Boot: Enabled.
// Library: MFRC522 by GithubCommunity (miguelbalboa/rfid).
// This overwrites the existing NDEF content on a writable NTAG213/215/216.
// For MIFARE Classic cards use carelink_rc522_c3 + carelink_card_bridge.py.
#include <SPI.h>
#include <MFRC522.h>
#include <string.h>

constexpr uint8_t SS_PIN = 7;
constexpr uint8_t RST_PIN = 3;
constexpr uint8_t SCK_PIN = 4;
constexpr uint8_t MISO_PIN = 5;
constexpr uint8_t MOSI_PIN = 6;

// Copy the real patient URL from CareLink. On a phone, localhost will NOT
// reach your laptop. Replace the IP and database patient ID below.
const char PATIENT_URL[] =
    "http://YOUR_LAPTOP_IP:8000/patient/YOUR_PATIENT_ID";

MFRC522 reader(SS_PIN, RST_PIN);
bool ready = false;
// Limit writes to pages 4..39, within all three supported NTAG models.
byte ndef[144] = {};
size_t ndefBytes = 0;

bool readPage(byte page, byte *out) {
  byte buffer[18];  // READ returns 16 data bytes + CRC.
  byte size = sizeof(buffer);
  MFRC522::StatusCode status = reader.MIFARE_Read(page, buffer, &size);
  if (status != MFRC522::STATUS_OK) {
    Serial.print("Read failed: ");
    Serial.println(reader.GetStatusCodeName(status));
    return false;
  }
  memcpy(out, buffer, 4);
  return true;
}

bool writePage(byte page, byte *data) {
  MFRC522::StatusCode status = reader.MIFARE_Ultralight_Write(page, data, 4);
  if (status != MFRC522::STATUS_OK) {
    Serial.print("Write failed at page ");
    Serial.print(page);
    Serial.print(": ");
    Serial.println(reader.GetStatusCodeName(status));
    return false;
  }
  return true;
}

bool buildNdef() {
  const size_t urlLength = strlen(PATIENT_URL);
  if (strstr(PATIENT_URL, "YOUR_") != nullptr ||
      (strncmp(PATIENT_URL, "http://", 7) != 0 &&
       strncmp(PATIENT_URL, "https://", 8) != 0)) {
    Serial.println("Edit PATIENT_URL to your actual HTTP(S) patient URL first.");
    return false;
  }
  // TLV(2) + NDEF header/type/prefix(5) + URL + terminator(1).
  ndefBytes = urlLength + 8;
  if (ndefBytes > sizeof(ndef)) {
    Serial.println("URL too long: maximum 136 bytes in this sketch.");
    return false;
  }
  ndef[0] = 0x03;             // NDEF message TLV
  ndef[1] = byte(urlLength + 5);
  ndef[2] = 0xD1;             // MB, ME, short record, well-known type
  ndef[3] = 0x01;             // Type length
  ndef[4] = byte(urlLength + 1); // Payload length
  ndef[5] = 0x55;             // Type 'U': URI
  ndef[6] = 0x00;             // No prefix compression; store complete URL
  memcpy(ndef + 7, PATIENT_URL, urlLength);
  ndef[7 + urlLength] = 0xFE; // TLV terminator
  return true;
}

bool writePatientUrl() {
  if (reader.PICC_GetType(reader.uid.sak) != MFRC522::PICC_TYPE_MIFARE_UL) {
    Serial.println("UID read OK, but this is not a supported Type 2 tag.");
    Serial.println("MIFARE Classic: use the existing CareLink UID reader/bridge.");
    return false;
  }
  byte cc[4], locks[4];
  if (!readPage(3, cc) || !readPage(2, locks)) return false;
  // Accept the standard NTAG213/215/216 capability containers only.
  if (cc[0] != 0xE1 || cc[1] != 0x10 || cc[3] != 0x00 ||
      (cc[2] != 0x12 && cc[2] != 0x3E && cc[2] != 0x6D)) {
    Serial.println("Unsupported/unformatted/protected tag. Use a writable NTAG213/215/216.");
    return false;
  }
  if (locks[2] != 0 || locks[3] != 0) {
    Serial.println("Static lock bits set; refusing to overwrite this tag.");
    return false;
  }

  // Mark NDEF empty before updating; publish the actual length LAST.
  // Never write UID, capability container, locks, password or config pages.
  byte empty[4] = {0x03, 0x00, 0xFE, 0x00};
  if (!writePage(4, empty)) return false;
  const size_t pages = (ndefBytes + 3) / 4;
  for (size_t i = 1; i < pages; ++i) {
    if (!writePage(byte(4 + i), ndef + i * 4)) return false;
  }
  if (!writePage(4, ndef)) return false;

  for (size_t i = 0; i < pages; ++i) {
    byte actual[4];
    if (!readPage(byte(4 + i), actual)) return false;
    if (memcmp(actual, ndef + i * 4, 4) != 0) {
      Serial.println("Read-back mismatch. Keep tag still and retry.");
      return false;
    }
  }
  Serial.println("SUCCESS: NDEF URL written and read-back verified.");
  Serial.println(PATIENT_URL);
  Serial.println("Remove wristband from RC522, then tap it with an NFC phone.");
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("CareLink NDEF wristband writer / ESP32-C3 SuperMini");
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  reader.PCD_Init();
  delay(50);
  reader.PCD_DumpVersionToSerial();
  byte version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("RC522 not responding. Check 3.3V, wiring and solder joints.");
    return;
  }
  ready = buildNdef();
  if (ready) Serial.println("Hold ONE writable NTAG wristband still near RC522. Existing content will be replaced.");
}

void loop() {
  if (!ready) { delay(100); return; }
  if (!reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) {
    delay(20);
    return;
  }
  Serial.print("UID:");
  for (byte i = 0; i < reader.uid.size; ++i) {
    if (reader.uid.uidByte[i] < 0x10) Serial.print('0');
    Serial.print(reader.uid.uidByte[i], HEX);
  }
  Serial.println();
  Serial.print("Type: ");
  Serial.println(reader.PICC_GetTypeName(reader.PICC_GetType(reader.uid.sak)));
  if (!writePatientUrl()) Serial.println("Not completed. Remove tag, check message, and retry.");
  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  delay(1000);
}
