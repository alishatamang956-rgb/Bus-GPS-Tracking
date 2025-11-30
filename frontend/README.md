Frontend (React + Vite) - Purpose

This folder is a recommended React (Vite) app that will:
- Fetch /api/positions from the backend
- Display a list of recent positions
- Show positions on a map (suggested: Leaflet or Mapbox)

Quick start (recommended):
1. cd frontend
2. npm install
3. npm run dev

Example files included: minimal App component that fetches data.

MinuteVideo feature:
- A short overlay video plays over the map area (default every 30s).
- Default video source: https://sijankadel54-wq.github.io/Ecobus-stop/media/texas.mp4
- Configurable in `frontend/src/App.jsx` by changing the `MinuteVideo` props: `videoSrc`, `intervalMs`, and `showDurationMs`.
 - By default the video is now displayed as an overlay over the map area (not the entire page) and shown for 15 seconds.

Additional details:
- The overlay now includes a "Close" button (top-right of the overlay) which will dismiss the current playback and snooze the ad for one interval by default.
- The overlay is constrained to the map area and is centered; it uses a translucent background so map is still visible under the overlay.

Notes:
- Autoplay with sound: many browsers block autoplay with sound — the app will attempt unmuted autoplay, but will fallback to muted playback and show an "Enable sound" button if blocked. To ensure audio, the user must interact with the page (click) at least once.
- If you prefer to use a local file, place it in `frontend/public/videos/` and set `videoSrc` to `/videos/myclip.mp4`.
