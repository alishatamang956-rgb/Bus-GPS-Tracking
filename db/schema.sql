-- SQLite schema for storing GPS readings

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  timestamp TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);

-- Index for queries by timestamp
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
