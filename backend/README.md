Backend (Node + Express) - Purpose

This folder contains a minimal Express server that exposes endpoints to:
- POST /api/readings  - receive JSON payload from ESP32 and store in DB (recommended)
- GET  /api/positions - return recent stored positions (paginated or latest N)

Example files included:
- index.js - minimal server showing how to connect to a sqlite DB and return positions
- package.json - stub with dependencies

How to run (quick dev):
1. cd backend
2. npm install
3. node index.js (or npm start)

Note: adjust DB path in index.js if needed.
