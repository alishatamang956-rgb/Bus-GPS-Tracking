const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Usage: node import_csv.js <csv-file>
const csvFile = process.argv[2] || path.join(__dirname, 'readings_mahalaxmi.csv');
// Match backend index.js DB path (project root /db/positions.db)
const DB_FILE = path.join(__dirname, '..', '..', 'db', 'positions.db');

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = cols[i] || '';
    return obj;
  });
  return rows;
}

function validFloat(v) { return !isNaN(parseFloat(v)); }

if (!fs.existsSync(csvFile)) {
  console.error('CSV file not found:', csvFile);
  process.exit(1);
}

const content = fs.readFileSync(csvFile, 'utf8');
const records = parseCSV(content);
if (!records.length) {
  console.log('No records found in CSV.');
  process.exit(0);
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Failed to open DB:', DB_FILE, err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  const stmt = db.prepare('INSERT INTO readings (device_id, timestamp, latitude, longitude) VALUES (?, ?, ?, ?)');
  let inserted = 0;
  for (const r of records) {
    const lat = parseFloat(r.latitude);
    const lon = parseFloat(r.longitude);
    const ts = r.timestamp;
    const device = r.device_id || null;
    if (!validFloat(lat) || !validFloat(lon) || !ts) {
      console.warn('Skipping invalid row:', r);
      continue;
    }
    stmt.run(device, ts, lat, lon, function(err) {
      if (err) console.error('Insert error:', err.message);
    });
    inserted++;
  }
  stmt.finalize();
  db.run('COMMIT', (err) => {
    if (err) console.error('Commit error:', err.message);
    else console.log(`Inserted ${inserted} rows from ${path.basename(csvFile)} into ${DB_FILE}`);
    db.close();
  });
});
