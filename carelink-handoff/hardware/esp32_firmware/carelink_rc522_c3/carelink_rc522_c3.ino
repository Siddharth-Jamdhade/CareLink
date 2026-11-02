// CareLink: ESP32-C3 SuperMini + RC522, USB serial UID reader.
// RC522: SDA/SS=7, SCK=4, MOSI=6, MISO=5, RST=3, VCC=3V3, GND=GND.
// Board: ESP32C3 Dev Module. USB CDC On Boot: Enabled.
// Install MFRC522 (GithubCommunity) using Arduino Library Manager.
#include <SPI.h>
#include <MFRC522.h>

constexpr uint8_t SS_PIN = 7;
constexpr uint8_t RST_PIN = 3;
constexpr uint8_t SCK_PIN = 4;
constexpr uint8_t MISO_PIN = 5;
constexpr uint8_t MOSI_PIN = 6;
MFRC522 reader(SS_PIN, RST_PIN);
bool readerReady = false;

void setup() {
  Serial.begin(115200);
  delay(1500);
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  reader.PCD_Init();
  delay(50);
  byte version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.println("CareLink RC522 / ESP32-C3 SuperMini");
  reader.PCD_DumpVersionToSerial();
  readerReady = version != 0x00 && version != 0xFF;
  if (!readerReady) {
    Serial.println("ERROR: Reader not responding. Check 3.3V, wiring and solder joints; reset after fixing.");
    return;
  }
  Serial.println("Ready. Present one card/keychain; remove it before scanning again.");
}

void loop() {
  if (!readerReady) {
    delay(1000);
    return;
  }
  if (!reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) {
    delay(20);
    return;
  }
  // Stable machine-readable format for carelink_card_bridge.py.
  Serial.print("UID:");
  for (byte i = 0; i < reader.uid.size; ++i) {
    if (reader.uid.uidByte[i] < 0x10) Serial.print('0');
    Serial.print(reader.uid.uidByte[i], HEX);
  }
  Serial.println();
  Serial.print("Type: ");
  Serial.println(reader.PICC_GetTypeName(reader.PICC_GetType(reader.uid.sak)));
  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  delay(250);
}
