Project: ESP32 -> Database -> Frontend

Purpose
- Receive GPS data (latitude, longitude, timestamp) from ESP32 into a database.
- Provide a backend API that serves stored coordinates.
- A frontend that fetches the API and displays positions (list + map).

Repository layout (created)
- backend/       - Node/Express API to read from DB and expose endpoints
- frontend/      - React (Vite) app to display data (map + list)
- db/            - SQL schema and helper scripts (sqlite by default)
- docs/          - Protocol, payload format, integration docs
- scripts/       - helper scripts (seed DB, migrations, etc.)

Next steps
1. Implement backend endpoint to return latest entries (e.g. /api/positions).
2. Implement frontend fetching + map display.
3. Configure DB and ESP32 to post payloads matching docs/esp32_payload.md
