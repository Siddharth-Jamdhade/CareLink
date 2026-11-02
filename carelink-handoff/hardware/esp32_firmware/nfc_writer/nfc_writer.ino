// Board: ESP32 Dev Module (classic ESP32, not ESP32-C3).
// Libraries: MFRC522 1.4.x, ArduinoJson 7.x; SPI/WiFi/WebServer from ESP32 core.
// RC522: 3.3V ONLY, GND, SS=5, RST=22, SCK=18, MISO=19, MOSI=23.
// Writes writable NTAG215 tags only. Never writes lock/config/password pages.
#include <WiFi.h>
#include <WebServer.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
WebServer server(80);
MFRC522 reader(5, 22);

bool writePage(byte page, byte *data) {
  if (reader.MIFARE_Ultralight_Write(page, data, 4) != MFRC522::STATUS_OK) return false;
  byte verify[18]; byte size = sizeof(verify);
  return reader.MIFARE_Read(page, verify, &size) == MFRC522::STATUS_OK && memcmp(verify, data, 4) == 0;
}

void handleWrite() {
  JsonDocument doc;
  if (server.arg("plain").length() > 1024 || deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}"); return; }
  String url = doc["url"] | "";
  byte prefix = url.startsWith("http://") ? 0x03 : url.startsWith("https://") ? 0x04 : 0;
  if (!prefix || url.length() > 240) { server.send(400, "application/json", "{\"error\":\"HTTP(S) URL required, max 240 bytes\"}"); return; }
  String suffix = url.substring(prefix == 0x03 ? 7 : 8);
  // Short NDEF URI record: MB|ME|SR|TNF=well-known, type U, URI prefix byte.
  byte data[256] = {0};
  unsigned payload = suffix.length() + 1, recordLength = payload + 4;
  data[0] = 0x03; data[1] = recordLength; // NDEF TLV
  data[2] = 0xd1; data[3] = 1; data[4] = payload; data[5] = 0x55; data[6] = prefix;
  memcpy(data + 7, suffix.c_str(), suffix.length());
  unsigned total = 7 + suffix.length(); data[total++] = 0xfe;
  unsigned pages = (total + 3) / 4;
  unsigned long start = millis();
  while (millis() - start < 10000) {
    if (reader.PICC_IsNewCardPresent() && reader.PICC_ReadCardSerial()) {
      String tag;
      for (byte i = 0; i < reader.uid.size; i++) { if (reader.uid.uidByte[i] < 16) tag += '0'; tag += String(reader.uid.uidByte[i], HEX); }
      // NTAG215 capability container advertises 0x3e * 8 bytes; reject other tags.
      byte cc[18]; byte size = sizeof(cc);
      bool ok = reader.MIFARE_Read(3, cc, &size) == MFRC522::STATUS_OK && cc[0] == 0xe1 && cc[2] == 0x3e && (cc[3] & 0x0f) == 0;
      byte empty[4] = {0x03, 0, 0xfe, 0};
      if (ok) ok = writePage(4, empty); // Invalidate old NDEF until write succeeds.
      for (unsigned i = 1; ok && i < pages; ++i) ok = writePage(4 + i, data + 4 * i);
      if (ok) ok = writePage(4, data); // Publish length last.
      reader.PICC_HaltA(); reader.PCD_StopCrypto1();
      if (ok) server.send(200, "application/json", "{\"status\":\"written\",\"tag_id\":\"" + tag + "\"}");
      else server.send(400, "application/json", "{\"error\":\"Use an unlocked NTAG215 and hold it steady\"}");
      return;
    }
    delay(30);
  }
  server.send(200, "application/json", "{\"status\":\"timeout\"}");
}

void setup() {
  Serial.begin(115200); SPI.begin(18, 19, 23, 5); reader.PCD_Init();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.println(WiFi.localIP()); server.on("/write", HTTP_POST, handleWrite); server.begin();
}
void loop() { server.handleClient(); }
