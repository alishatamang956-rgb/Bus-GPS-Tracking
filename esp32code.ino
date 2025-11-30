#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SoftwareSerial.h>
#include <SD.h>
#include <FS.h>

// SIM800L on SoftwareSerial
SoftwareSerial mySerial(16, 17);

int i = 0;

// ---------- WiFi Configuration ----------
const char* ssid = "LAPTOP-P84GPKPD6168";
const char* password = "11111111";

// ---------- Backend Server ----------
const char* serverUrl = "http://192.168.120.25:3001/api/readings";
const char* deviceId = "esp32-01";

// ---------- GPS Configuration ----------
HardwareSerial GPSserial(2);
const int RXPin = 27;  // GPS TX → ESP32 RX
const int TXPin = 14;  // GPS RX → ESP32 TX (optional)

TinyGPSPlus gps;

// ---------- Timing ----------
const unsigned long postIntervalMs = 15000UL;
unsigned long lastPostMs = 0;

// ---------- SD CARD PINS ----------
#define SD_CS   5
// SCK=18, MISO=19, MOSI=23 (default ESP32 SPI pins)

// ---------- Timestamp Builder ----------
String makeIsoTimestamp() {
  if (!gps.time.isValid() || !gps.date.isValid()) return String();

  char buf[32];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02dZ",
           gps.date.year(),
           gps.date.month(),
           gps.date.day(),
           gps.time.hour(),
           gps.time.minute(),
           gps.time.second());
  return String(buf);
}

// ---------- HTTP POST ----------
void postJson(const String &jsonPayload) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping POST");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.printf("POST %d: %s\n", httpResponseCode, http.getString().c_str());
  } else {
    Serial.printf("POST failed: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ---------- WAV PLAYBACK (DAC → PM8403) ----------
void playWavFile(const char *filename) {
  Serial.println("Opening WAV file...");
  File wavFile = SD.open(filename);
  if (!wavFile) {
    Serial.println("Failed to open WAV file!");
    return;
  }

  Serial.println("Playing WAV file...");

  // Skip 44-byte WAV header
  for (int i = 0; i < 44; i++) wavFile.read();

  while (wavFile.available()) {
    uint8_t sample = wavFile.read();  // 8-bit PCM sample
    dacWrite(25, sample);             // Output to DAC GPIO25 → PM8403
    delayMicroseconds(45);            // ~22 kHz sample rate
  }

  wavFile.close();
  Serial.println("WAV playback finished.");
}

// ---------- SIM800L SMS ----------
void sendSMS(double lat, double lon) {
  Serial.println("Sending SMS...");

  sendAT("AT");
  sendAT("AT+CSQ");
  sendAT("AT+CCID");
  sendAT("AT+CREG?");
  sendAT("AT+CMGF=1");

  mySerial.println("AT+CMGS=\"+9779767285559\"");
  delay(1000);

  mySerial.print("This bus has arrived at:\nLatitude: ");
  mySerial.print(lat, 6);
  mySerial.print("\nLongitude: ");
  mySerial.print(lon, 6);

  delay(500);
  mySerial.write(26); // CTRL+Z to send

  Serial.println("\nSMS Sent.");
}

void sendAT(String cmd) {
  mySerial.println(cmd);
  delay(500);
  while (mySerial.available()) Serial.write(mySerial.read());
}

void updateSerial() {
  while (Serial.available())  mySerial.write(Serial.read());
  while (mySerial.available()) Serial.write(mySerial.read());
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);

  // SIM800L
  mySerial.begin(9600);

  Serial.println("Initializing SIM800L...");
  delay(1000);

  sendAT("AT");
  sendAT("AT+CSQ");
  sendAT("AT+CCID");
  sendAT("AT+CREG?");
  sendAT("AT+CMGF=1");

  // GPS
  GPSserial.begin(9600, SERIAL_8N1, RXPin, TXPin);
  Serial.printf("GPS serial started on RX=%d TX=%d\n", RXPin, TXPin);

  // WiFi
  Serial.printf("Connecting to WiFi '%s'...\n", ssid);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED)
    Serial.println("\nWiFi connected, IP: " + WiFi.localIP().toString());
  else
    Serial.println("\nWiFi connect FAILED");

  updateSerial();

  // ---------- SD CARD ----------
  Serial.println("Initializing SD card...");
  if (!SD.begin(SD_CS)) {
    Serial.println("SD card init FAILED!");
  } else {
    Serial.println("SD card OK");
  }
}

// ---------- LOOP ----------
void loop() {

  // Feed GPS
  while (GPSserial.available())
    gps.encode(GPSserial.read());

  // Debug passthrough
  while (Serial.available())
    GPSserial.write(Serial.read());

  bool haveLocation = gps.location.isValid();
  bool haveTime = gps.time.isValid() && gps.date.isValid();

  // Print GPS status every 5 sec
  static unsigned long lastStatusMs = 0;
  if (millis() - lastStatusMs > 5000) {
    lastStatusMs = millis();

    Serial.printf("GPS age: loc=%lld time=%lld sat=%d\n",
                  gps.location.age(), gps.time.age(), gps.satellites.value());

    if (haveLocation)
      Serial.printf("Lat: %.6f Lon: %.6f\n", gps.location.lat(), gps.location.lng());
    else
      Serial.println("No GPS fix.");

    if (haveTime)
      Serial.println("Time: " + makeIsoTimestamp());
  }

  // Post + SMS + Music
  if (haveLocation && haveTime) {
    unsigned long now = millis();

    if (lastPostMs == 0 || now - lastPostMs >= postIntervalMs) {
      lastPostMs = now;

      double lat = gps.location.lat();
      double lon = gps.location.lng();

      String json = "{";
      json += "\"device_id\":\"" + String(deviceId) + "\",";
      json += "\"timestamp\":\"" + makeIsoTimestamp() + "\",";
      json += "\"latitude\":" + String(lat, 7) + ",";
      json += "\"longitude\":" + String(lon, 7);
      json += "}";

      Serial.println("POSTING: " + json);
      postJson(json);

      i++;
      if (i == 1) {
        sendSMS(lat, lon);
        playWavFile("/alert.wav");   // <-- music plays here
      }
    }
  }

  delay(10);
}
