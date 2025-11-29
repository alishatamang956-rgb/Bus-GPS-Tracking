ESP32 JSON payload

The ESP32 should POST JSON to the backend. Example payload:

{
  "device_id": "esp32-01",
  "timestamp": "2025-11-24T12:34:56Z",
  "latitude": 37.4219983,
  "longitude": -122.084
}

Content notes:
- timestamp should be ISO 8601 UTC string or Unix epoch seconds.
- device_id is optional but recommended to identify multiple devices.
- Server will validate numeric latitude/longitude and timestamp.
