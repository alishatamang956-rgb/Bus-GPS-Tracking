const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, '..', 'db', 'positions.db');
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Open database (will create file if not exists)
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) return console.error('DB open error', err);
  console.log('Connected to sqlite DB:', DB_FILE);
});

// Ensure schema exists
const schema = `
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  timestamp TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);
`;
db.exec(schema, (err) => { if (err) console.error('Schema error', err); });

// Endpoint to receive readings from ESP32
app.post('/api/readings', (req, res) => {
  const { device_id, timestamp, latitude, longitude } = req.body || {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !timestamp) {
    return res.status(400).json({ error: 'Invalid payload: latitude, longitude (numbers) and timestamp required' });
  }
  const stmt = db.prepare('INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES (?, ?, ?, ?)');
  stmt.run(device_id || null, timestamp, latitude, longitude, function(err) {
    if (err) return res.status(500).json({ error: 'DB insert failed' });
    res.json({ id: this.lastID });
  });
});

// Return latest N positions (default N=100)
app.get('/api/positions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
  db.all('SELECT id, device_id, timestamp, latitude, longitude FROM readings ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB query failed' });
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
