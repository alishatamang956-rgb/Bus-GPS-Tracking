# Bus GPS Tracking System - Project Documentation

**Project Date:** November 29, 2025  
**Version:** 1.0  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture & Flowchart](#system-architecture--flowchart)
3. [User Guide](#user-guide)
4. [Software Documentation](#software-documentation)
5. [Hardware Setup](#hardware-setup)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Deployment & Troubleshooting](#deployment--troubleshooting)

---

## System Overview

The **Bus GPS Tracking System** is a real-time geolocation tracking application that receives GPS coordinates from ESP32 microcontrollers equipped with NEO-7M GPS modules, stores the data in a database, and displays bus positions and estimated time of arrival (ETA) on an interactive web map.

### Key Features

- **Real-time GPS tracking** from multiple ESP32 devices
- **Interactive map display** with Leaflet (OpenStreetMap)
- **Route visualization** with OSRM (Open Source Routing Machine)
- **ETA calculation** with safety factors and speed analysis
- **Saved destinations/stops** with persistent storage
- **Fullscreen map mode** for better visibility
- **Historical position table** with sortable data
- **Polling-based live updates** (10s interval)
- **Minute ad/video overlay** that plays a short clip over the map periodically (optional, configurable)

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Microcontroller** | ESP32 + NEO-7M GPS Module |
| **Backend** | Node.js + Express |
| **Database** | SQLite |
| **Frontend** | React 18 + Vite |
| **Map Library** | Leaflet + OpenStreetMap Tiles |
| **Routing** | OSRM Public API (with fallback) |

---

## System Architecture & Flowchart

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ESP32 Devices                 Backend Server                 Frontend
│  ┌──────────────┐              ┌────────────┐               ┌──────────┐
│  │ NEO-7M GPS   │              │  Express   │               │  React   │
│  │  Module      │              │  API       │               │  + Leaflet
│  │              │              │            │               │          │
│  │ • Read GNSS  │              │ • Stores   │               │ • Map    │
│  │ • Format JSON│────HTTP POST─│   readings │────Poll ────►│ • Marks  │
│  │ • POST to    │   (lat/lon)  │ • Returns  │   every 10s   │ • Route  │
│  │   /api/      │              │   positions│               │ • ETA    │
│  │   readings   │              │ • Computes │               │          │
│  └──────────────┘              └────────────┘               └──────────┘
│          ▲                             │                          │
│          │                             ▼                          │
│          │                      ┌──────────────┐                  │
│          │                      │   SQLite DB  │                  │
│          │                      │              │                  │
│          │                      │  readings    │                  │
│          │                      │  table       │                  │
│          └──────────────────────┴──────────────┘                  │
│                                                                   │
│  Optional:                                                       │
│  • OSRM Routing API for route-aware ETA                         │
│  • localStorage for saved stops (client-side)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Flowchart: From GPS Fix to Map Display

```
START (ESP32)
    │
    ▼
┌─────────────────────────┐
│ Read NEO-7M GNSS Data   │
│ (via UART @ 9600 baud)  │
└─────────┬───────────────┘
          │ TinyGPSPlus parses NMEA
          ▼
┌─────────────────────────┐
│ GPS Fix Valid?          │
└─────────┬───────────────┘
          │ No ──► Retry in loop
          │ Yes
          ▼
┌─────────────────────────┐
│ Connect to WiFi         │
│ (SSID/Password config)  │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Format JSON Payload:    │
│ {                       │
│  "device_id": "esp32-01"│
│  "timestamp": "2025..." │
│  "latitude": 37.42...   │
│  "longitude": -122.08..│
│ }                       │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ POST to Backend         │
│ /api/readings           │
└─────────┬───────────────┘
          │
          ▼
   BACKEND (Node.js)
    │
    ▼
┌─────────────────────────┐
│ Validate Payload        │
│ (lat, lon numbers?)     │
└─────────┬───────────────┘
          │ Valid
          ▼
┌─────────────────────────┐
│ Insert into DB          │
│ readings table          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Return success (200 OK) │
│ with inserted row ID    │
└─────────┬───────────────┘
          │
          ▼
   FRONTEND (React)
    │
    ▼
┌─────────────────────────┐
│ Poll /api/positions     │
│ every 10 seconds        │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Fetch recent 200 rows   │
│ ordered by timestamp    │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Update React state      │
│ setPositions(rows)      │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Re-render:              │
│ • Clear old markers     │
│ • Draw positions as     │
│   blue circles          │
│ • Draw polyline (path)  │
│ • Highlight last pos    │
│   (red marker)          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ User clicks destination │
│ on map?                 │
└─────────┬───────────────┘
          │ Yes
          ▼
┌─────────────────────────┐
│ Call OSRM Routing API   │
│ GET /route/v1/driving/  │
│   {lon,lat};{lon,lat}   │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Receive route           │
│ geometry & duration     │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Apply safety factor     │
│ (×1.15) to duration     │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Display:                │
│ • Green route polyline  │
│ • ETA in popup          │
│ • Arrival timestamp     │
└─────────┬───────────────┘
          │
          ▼
END (Map updated)
```

---

## User Guide

### 1. Accessing the Application

1. Ensure the backend is running:
   ```bash
   cd e:\Bus\backend
   npm start
   ```
   Backend listens on `http://localhost:3001`

2. Start the frontend dev server:
   ```bash
   cd e:\Bus\frontend
   npm run dev
   ```
   Frontend dev server typically runs on `http://localhost:5173`

3. Open your browser and navigate to the frontend URL.

### 2. Main Interface

The application displays:

- **Left Pane:**
  - Saved stops section with Add/Go/Remove buttons
  - Table of recent GPS positions (time, device, latitude, longitude)

- **Right Pane:**
  - Interactive map showing bus positions
  - Blue circles: previous positions
  - Red marker: current/latest position
  - Blue polyline: historical path
  - Close button: to exit fullscreen mode

- **Map Controls:**
  - Zoom in/out (scroll or buttons)
  - Click to set destination
  - Click on route/path to set new destination

### 3. Using the Map

#### Viewing Positions
- Positions are automatically fetched every 10 seconds
- Blue circles show historical waypoints
- Red marker shows the most recent position
- Hover over any marker to see details (device ID, timestamp, coordinates)

#### Setting a Destination

**Method 1: Direct Map Click**
1. Click anywhere on the map to set a destination
2. A destination marker (green if routed, red if straight-line) appears
3. A route polyline is drawn from current position to destination
4. ETA is displayed in the destination popup

**Method 2: Using Saved Stops**
1. In the left pane "Saved stops" section, enter:
   - Stop name (e.g., "Central Station")
   - Latitude (e.g., 37.4219983)
   - Longitude (e.g., -122.084)
2. Click "Add" to save
3. To set as destination, click the "Go" button next to the stop
4. The map updates with the route and ETA

#### ETA Calculation

-- **Route-based ETA** (green route): Uses OSRM to calculate driving time along roads; includes a 25% safety buffer (configurable)
- **Straight-line ETA** (red dashed route): Fallback if OSRM fails; calculates based on recent bus speed with a 50% safety buffer (configurable)

The ETA shows:
- Duration (e.g., "15m 30s")
- Approximate arrival timestamp (UTC)

#### Fullscreen Mode

1. Click "Full screen map" button to expand the map to fill the browser window
2. A "Close" button appears in the top-right corner
3. Press **Escape** key or click "Close" to exit fullscreen

### 6. Minute Video / Ad Overlay

- The frontend optionally displays a short overlay video that plays periodically (default every 30s) over the map area.
- It is configurable in `frontend/src/App.jsx` by setting the `videoOverlayConfig` prop passed to `MapView`.
  - `videoSrc`: URL or local path to the video file (e.g., `/videos/texas.mp4` or remote URL)
  - `intervalMs`: time between playbacks in milliseconds (default 30000)
  - `showDurationMs`: how long the video is visible in milliseconds (default 15000)
  - `muted`: boolean, if false the app will try to play with sound; if the browser blocks autoplay with sound it will fall back to muted playback and show an "Enable sound" button.
  - `fullscreenOverlay`: boolean, whether the overlay should fill the map container area (default true)

Usage:
1. Configure `videoOverlayConfig` in `App.jsx` (or pass a different config to `MapView`):
```js
<MapView
  ...
  videoOverlayConfig={{
    videoSrc: 'https://sijankadel54-wq.github.io/Ecobus-stop/media/texas.mp4',
    intervalMs: 30000,
    showDurationMs: 15000,
    muted: false,
    fullscreenOverlay: true
  }}
/>
```

2. Behavior: The overlay will display over the map for the configured duration. It includes a Close button (snooze) and an "Enable sound" button if autoplay with sound is blocked; clicking enable will request user gesture playback with sound.

3. Note: Autoplay with sound is blocked on many browsers until the user interacts. The fallback behavior shows video muted and the enable button.

### 4. Viewing Historical Data

- The left pane table shows the last 200 recorded positions
- Columns: Time, Device, Latitude, Longitude
- Rows are ordered newest-to-oldest
- Click on any row or marker to view details

### 5. Managing Stops

- **Add Stop:** Enter name, lat, lng and click "Add"
- **Save Behavior:** Stops are persisted to browser `localStorage`; they survive page refreshes
- **Go to Stop:** Click "Go" to set as destination
- **Remove Stop:** Click "Remove" to delete the stop

---

## Software Documentation

### 3.1 Backend Architecture (Node.js + Express)

#### File: `backend/index.js`

**Responsibilities:**
- Start HTTP server on port 3001
- Accept POST requests at `/api/readings` with GPS payloads
- Validate and store GPS data in SQLite
- Return stored positions via GET `/api/positions`

**Key Endpoints:**

##### POST `/api/readings`
Receive GPS reading from ESP32

**Request Body:**
```json
{
  "device_id": "esp32-01",
  "timestamp": "2025-11-29T12:34:56Z",
  "latitude": 37.4219983,
  "longitude": -122.084
}
```

**Response (Success - 200):**
```json
{
  "id": 123
}
```

**Response (Validation Error - 400):**
```json
{
  "error": "Invalid payload: latitude, longitude (numbers) and timestamp required"
}
```

**Database Insert:**
```sql
INSERT INTO readings (device_id, timestamp, latitude, longitude)
VALUES ('esp32-01', '2025-11-29T12:34:56Z', 37.4219983, -122.084);
```

##### GET `/api/positions`
Retrieve recent positions

**Query Parameters:**
- `limit` (optional, default=100, max=1000): number of recent rows to return

**Request:**
```
GET /api/positions?limit=50
```

**Response (200):**
```json
[
  {
    "id": 1,
    "device_id": "esp32-01",
    "timestamp": "2025-11-29T12:00:00Z",
    "latitude": 37.4219983,
    "longitude": -122.084
  },
  {
    "id": 2,
    "device_id": "esp32-01",
    "timestamp": "2025-11-29T12:05:00Z",
    "latitude": 37.4220100,
    "longitude": -122.0850
  }
]
```

**Ordering:** Results are ordered by `timestamp DESC` (most recent first)

#### Database Schema (SQLite)

```sql
CREATE TABLE readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  timestamp TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);

CREATE INDEX idx_readings_timestamp ON readings(timestamp);
```

**Fields:**
- `id`: Unique auto-incrementing row ID
- `device_id`: Optional identifier for the device posting the data (e.g., "esp32-01", "esp32-02")
- `timestamp`: ISO 8601 UTC string or Unix timestamp
- `latitude`: Decimal latitude (-90 to 90)
- `longitude`: Decimal longitude (-180 to 180)

### 3.2 Frontend Architecture (React + Vite)

#### File: `frontend/src/App.jsx`

**Responsibilities:**
- Manage global state: positions, destination, stops, fullscreen mode
- Fetch positions from backend via polling
- Handle stop management (CRUD) with localStorage persistence
- Pass props and callbacks to child components

**Key State:**
```javascript
const [positions, setPositions] = useState([]);      // Array of GPS readings
const [destination, setDestination] = useState(null); // { lat, lng }
const [stops, setStops] = useState([]);              // Saved stops with names
const [fullScreen, setFullScreen] = useState(false); // Toggle fullscreen map
```

**Key Functions:**
- `fetchPositions()`: GET `/api/positions?limit=200`, parse JSON, validate numbers
- `addStop(name, lat, lng)`: Add stop, persist to localStorage
- `selectStop(stop)`: Set as destination
- `handleMapClick(latlng)`: Forward map clicks to set destination

**Component Tree:**
```
App
├── StopManager (left pane)
│   ├── Input fields: name, lat, lng
│   ├── Button: Add
│   └── Stop list (map/Go/Remove buttons)
├── Table (left pane)
│   └── Recent positions table
└── MapView (right pane)
    ├── Leaflet map instance
    ├── Position markers/polyline
    ├── Destination marker
    ├── Route polyline
    ├── Fullscreen button
    └── ETA popup
```

#### File: `frontend/src/MapView.jsx`

**Responsibilities:**
- Initialize and manage Leaflet map instance
- Render position markers and historical polyline
- Handle destination routing via OSRM
- Compute ETA (route-based or straight-line fallback)
- Support fullscreen mode

**Key Features:**

1. **Position Rendering:**
   - Each position as a small blue circle marker
   - Last position as a larger red marker
   - All positions connected by a blue polyline (path)

2. **Routing & ETA:**
   - Calls OSRM API: `https://router.project-osrm.org/route/v1/driving/lon,lat;lon,lat?overview=full&geometries=geojson`
   - Applies 1.15× safety factor to OSRM duration
   - Falls back to straight-line ETA if OSRM fails
   - Straight-line ETA uses median segment speed + 1.3× safety factor

3. **Speed Calculation (Fallback):**
   ```
   1. Compute per-segment speeds from last 8 positions
   2. Filter outliers (0.1–50 m/s)
   3. Use median speed weighted by segment duration
   4. Apply 1.3× safety factor
   5. ETA = distance / speed
   ```

4. **Fullscreen Mode:**
   - Map container becomes `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh`
   - Close button overlaid in top-right
   - Escape key exits fullscreen
   - `map.invalidateSize()` called to resize tiles

**Functions:**

- `haversineMeters(lat1, lon1, lat2, lon2)`: Compute great-circle distance
- `computeEtaText(lastPosition, destLatLng)`: Calculate straight-line ETA
- `formatDuration(seconds)`: Format duration to "Xh Ym" or "Xm Ys"

#### File: `frontend/src/MinuteVideo.jsx`

**Responsibilities:**
- Display a short overlay video over the map area on a schedule; default is 30s interval and 15s display duration
- Support unmuted playback where possible, fallback to muted playback if the browser blocks autoplay with sound
- Show a Close button that snoozes the ad for the next interval and an "Enable sound" button when the autoplay is blocked

**Config (from `App.jsx` via `MapView.videoOverlayConfig`):**
- `videoSrc` (required): string URL or path to the video
- `intervalMs` (optional): interval between plays in milliseconds (default 30000)
- `showDurationMs` (optional): display duration in milliseconds (default 15000)
- `muted` (optional): boolean; `false` attempts unmuted playback, `true` forces muted playback
- `fullscreenOverlay` (optional): boolean; if `true` overlay fills the map container

**Usage:** The `MapView` component accepts a `videoOverlayConfig` object (see `frontend/src/App.jsx`) and renders `MinuteVideo` into the map wrapper. The overlay is removed from the DOM when not visible so it does not block map interactions.


#### File: `frontend/vite.config.js`

**Purpose:** Configure Vite dev server to proxy `/api` requests to backend

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false
    }
  }
}
```

This allows frontend code to call `/api/positions` instead of `http://localhost:3001/api/positions`, simplifying local development and making production deployment easier.

---

## Hardware Setup

### ESP32 + NEO-7M Wiring

```
┌─────────────┐               ┌──────────────┐
│   NEO-7M    │               │    ESP32     │
│   GPS Mod   │               │   Board      │
├─────────────┤               ├──────────────┤
│ VCC         │───────────────│ 3.3V         │ (or 5V if level-shifted)
│ GND         │───────────────│ GND          │
│ TX          │───────────────│ RX2 (GPIO16) │
│ RX          │───────────────│ TX2 (GPIO17) │ (optional, typically not needed)
└─────────────┘               └──────────────┘
```

**Notes:**
- NEO-7M operates at 3.3V; ESP32 is also 3.3V native
- TX/RX: Use UART Serial2 on ESP32 (RX2=GPIO16, TX2=GPIO17)
- Baud rate: 9600
- Ground both devices together

### Arduino IDE Sketch Configuration

**Board:** ESP32 Dev Module  
**Port:** COM3 (or your USB serial port)  
**Baud:** 115200 (for Serial Monitor)  
**GPS Baud:** 9600 (for GPS module)

**Libraries to Install:**
- TinyGPSPlus (search in Library Manager)
- WiFi (built-in)
- HTTPClient (built-in)

**Sketch Key Variables:**
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://192.168.1.100:3001/api/readings"; // backend IP
const char* deviceId = "esp32-01";
const unsigned long postIntervalMs = 15 * 1000UL; // 15 seconds between POSTs
```

---

## API Reference

### Backend API Overview

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/readings` | Submit GPS reading | None (public) |
| GET | `/api/positions` | Retrieve recent positions | None (public) |

### Detailed API Specs

#### 1. POST `/api/readings`

**Purpose:** Submit a GPS reading from an ESP32 device

**Request:**
```http
POST /api/readings HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "device_id": "esp32-01",
  "timestamp": "2025-11-29T12:34:56Z",
  "latitude": 37.4219983,
  "longitude": -122.084
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123
}
```
The `id` is the SQLite row ID of the newly inserted reading.

**Response (Error - Invalid Payload):**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Invalid payload: latitude, longitude (numbers) and timestamp required"
}
```

**Response (Error - Server):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "DB insert failed"
}
```

**Validation Rules:**
- `latitude` and `longitude` must be numbers
- `timestamp` must be a string (ISO 8601 or Unix epoch)
- `device_id` is optional but recommended

#### 2. GET `/api/positions`

**Purpose:** Retrieve recent GPS readings

**Request:**
```http
GET /api/positions?limit=50 HTTP/1.1
Host: localhost:3001
```

**Query Parameters:**
- `limit` (optional): Number of recent rows to return. Default: 100. Max: 1000.

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": 200,
    "device_id": "esp32-01",
    "timestamp": "2025-11-29T12:10:00Z",
    "latitude": 37.42205,
    "longitude": -122.0851
  },
  {
    "id": 199,
    "device_id": "esp32-01",
    "timestamp": "2025-11-29T12:05:00Z",
    "latitude": 37.42203,
    "longitude": -122.0849
  }
]
```

**Response (Error):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "DB query failed"
}
```

**Ordering:** Results ordered by `timestamp DESC` (newest first)

---

## Database Schema

### Table: `readings`

```sql
CREATE TABLE readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  timestamp TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);

CREATE INDEX idx_readings_timestamp ON readings(timestamp);
```

#### Column Details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique row identifier |
| `device_id` | TEXT | NULL | Identifier for the GPS device (e.g., "esp32-01") |
| `timestamp` | TEXT | NOT NULL | ISO 8601 UTC or Unix epoch; when reading was recorded |
| `latitude` | REAL | NOT NULL | Decimal latitude (-90 to 90) |
| `longitude` | REAL | NOT NULL | Decimal longitude (-180 to 180) |

#### Example Data

```sql
INSERT INTO readings (device_id, timestamp, latitude, longitude) 
VALUES ('esp32-01', '2025-11-29T12:00:00Z', 37.4219983, -122.084);

INSERT INTO readings (device_id, timestamp, latitude, longitude) 
VALUES ('esp32-02', '2025-11-29T12:01:00Z', 37.4220500, -122.0850);
-- Mahalakshmisthan (Kathmandu) sample readings (inserted by CSV/import script)
INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES ('esp32-nepal-01', '2025-11-29T08:00:00Z', 27.712400, 85.323900);
INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES ('esp32-nepal-01', '2025-11-29T08:01:00Z', 27.712500, 85.323950);
INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES ('esp32-nepal-01', '2025-11-29T08:02:00Z', 27.712600, 85.324000);
INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES ('esp32-nepal-01', '2025-11-29T08:03:00Z', 27.712700, 85.324050);
INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES ('esp32-nepal-01', '2025-11-29T08:04:00Z', 27.712800, 85.324100);
```

#### Index

- `idx_readings_timestamp` on `timestamp` field for faster ordering/filtering queries

---

## Deployment & Troubleshooting

### Local Development Setup

1. **Clone/Navigate to Project:**
   ```bash
   cd e:\Bus
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   node index.js
   # Output: Backend listening on http://localhost:3001
   ```

3. **Frontend Setup (in new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Output: Local: http://localhost:5173
   ```

4. **ESP32 Upload:**
   - Copy the provided Arduino sketch into Arduino IDE
   - Update WiFi SSID, password, and backend URL
   - Select board "ESP32 Dev Module" and correct COM port
   - Click Upload

### Common Issues & Fixes

#### 1. "Connection Refused" Error on ESP32

**Symptom:** ESP32 logs show "POST failed, error: connection refused"

**Cause:** Backend not running or incorrect URL

**Fix:**
- Verify backend is running: `npm start` in `backend/` folder
- Check backend port: should be 3001
- Verify ESP32 URL uses host machine's LAN IP, not localhost
  ```cpp
  const char* serverUrl = "http://192.168.1.100:3001/api/readings"; // use your IP
  ```
- Use `ipconfig` on Windows to find your LAN IPv4 address

#### 2. Frontend Shows "No Positions Found"

**Symptom:** Map is empty, table shows no data

**Cause:** Backend not running or no data has been POSTed

**Fix:**
- Ensure backend is running and accessible
- Manually POST test data:
  ```powershell
  $body = @{
    device_id = "test"
    timestamp = "2025-11-29T12:00:00Z"
    latitude = 37.42
    longitude = -122.08
  } | ConvertTo-Json
  
  Invoke-RestMethod -Uri "http://localhost:3001/api/readings" `
    -Method Post -Body $body -ContentType "application/json"
  ```

#### 3. Map Not Loading or Tiles Missing

**Symptom:** Map container visible but no tiles, or blank grey area

**Cause:** Leaflet CSS not loaded or map not initialized properly

**Fix:**
- Check browser console for errors (F12)
- Verify Leaflet CSS link in `frontend/index.html`:
  ```html
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  ```
- Ensure Leaflet package is installed: `npm install leaflet`
- Hard refresh (Ctrl+Shift+R) to clear cache

#### 4. ETA Not Displaying or Always "Unknown"

**Symptom:** Destination popup shows "ETA: unknown"

**Cause:** Insufficient position history or bad timestamp parsing

**Fix:**
- Accumulate more position data (wait for several POSTs to arrive)
- Verify timestamp format is ISO 8601: "2025-11-29T12:34:56Z"
- Check browser console (F12) for parsing errors
- Ensure positions have valid latitude/longitude (numbers, not strings)

#### 5. Port 3001 Already in Use

**Symptom:** Backend error: "listen EADDRINUSE: address already in use :::3001"

**Cause:** Another process is bound to port 3001

**Fix:**
- Stop previous backend instance
- Find conflicting process:
  ```powershell
  netstat -ano | findstr ":3001"
  tasklist /FI "PID eq 1234"     # replace 1234 with PID from netstat
  taskkill /PID 1234 /F          # force kill the process
  ```
- Or run backend on a different port:
  ```powershell
  $env:PORT=3002; npm start
  # Update frontend vite.config.js proxy target to :3002
  ```

#### 6. OSRM Route Not Working (Red Dashed Line Instead of Green)

**Symptom:** Destination shows red dashed line (straight-line) instead of green (OSRM route)

**Cause:** OSRM API unreachable or rate limited

**Fix:**
- Check internet connection
- OSRM public demo has rate limits; if hitting them, consider self-hosting OSRM or using another routing provider
- Fallback ETA still works (based on recent speed)
- Check browser console for OSRM API errors

### Production Deployment Considerations

1. **Security:**
   - Enable HTTPS (TLS certificates) for both backend and frontend
   - Add authentication/authorization (API keys, JWT tokens)
   - Implement rate limiting on `/api/readings` to prevent abuse
   - Validate and sanitize all inputs

2. **Database:**
   - Switch from SQLite to PostgreSQL or MySQL for better concurrency and scalability
   - Add database migrations and versioning
   - Implement backup strategy

3. **Routing:**
   - Self-host OSRM or use commercial API (Mapbox, HERE, GraphHopper)
   - Implement caching of routes to reduce API calls

4. **Frontend:**
   - Build optimized production bundle: `npm run build`
   - Deploy to CDN or static hosting
   - Set `axios.defaults.baseURL` to production backend URL

5. **Monitoring:**
   - Log API requests and errors
   - Monitor database size and performance
   - Alert on ESP32 device disconnection or inactivity

---

## Additional Resources

### Documentation Files

- **`docs/esp32_payload.md`** – Expected JSON payload format from ESP32
- **`backend/README.md`** – Backend setup and run instructions
- **`frontend/README.md`** – Frontend setup and build instructions
- **`db/schema.sql`** – Database schema creation script
 - **`backend/scripts/readings_mahalaxmi.csv`** – CSV file with Mahalakshmisthan sample readings
 - **`backend/scripts/import_csv.js`** – Node.js script for importing CSV data into SQLite DB

### External APIs & Libraries

- **Leaflet.js** – https://leafletjs.com/
- **OpenStreetMap** – https://www.openstreetmap.org/
- **OSRM (Open Source Routing Machine)** – http://project-osrm.org/
- **TinyGPSPlus** – Arduino library for parsing NMEA from GPS modules
- **Express.js** – https://expressjs.com/
- **React.js** – https://react.dev/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-29 | Initial release with GPS tracking, mapping, ETA, and fullscreen features |

---

## Support & Contact

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console (F12) for errors
3. Check backend logs for POST validation failures
4. Verify ESP32 serial monitor for WiFi/GPS status

---

**End of Documentation**
