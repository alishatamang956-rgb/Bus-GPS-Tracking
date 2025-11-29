import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MapView from './MapView';

export default function App() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const POLL_MS = 10000; // 10s
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState(() => {
    try {
      const raw = localStorage.getItem('stops');
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  });

  const fetchPositions = async () => {
    try {
      const resp = await axios.get('/api/positions?limit=200');
      const rows = resp.data.map(r => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude)
      }));
      // show oldest -> newest
      setPositions(rows.reverse());
    } catch (err) {
      console.error('Failed to fetch positions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const id = setInterval(fetchPositions, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('stops', JSON.stringify(stops)); } catch (e) {}
  }, [stops]);

  function handleMapClick(latlng) {
    setDestination({ lat: latlng.lat, lng: latlng.lng });
  }

  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setFullScreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function addStop(name, lat, lng) {
    const stop = { id: Date.now(), name, lat: Number(lat), lng: Number(lng) };
    setStops(prev => [...prev, stop]);
  }

  function selectStop(stop) {
    setDestination({ lat: stop.lat, lng: stop.lng });
  }

  function removeStop(id) {
    setStops(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Bus Positions</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16 }}>
        <div>
          <div style={{ marginBottom: 12 }}>
            <h3>Saved stops</h3>
            <StopManager stops={stops} onAdd={addStop} onSelect={selectStop} onRemove={removeStop} />
          </div>

          {loading ? <p>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Time</th><th>Device</th><th>Lat</th><th>Lon</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: 8 }}>{p.timestamp}</td>
                    <td style={{ padding: 8 }}>{p.device_id || 'unknown'}</td>
                    <td style={{ padding: 8 }}>{p.latitude.toFixed(6)}</td>
                    <td style={{ padding: 8 }}>{p.longitude.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 6 }}>
            <button onClick={() => setFullScreen(true)}>Full screen map</button>
          </div>
          <MapView positions={positions} destination={destination} onMapClick={handleMapClick} fullScreen={fullScreen} onExitFullScreen={() => setFullScreen(false)} />
        </div>
      </div>
    </div>
  );
}

function StopManager({ stops, onAdd, onSelect, onRemove }) {
  let nameRef;
  let latRef;
  let lngRef;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input ref={r => nameRef = r} placeholder="Name" />
        <input ref={r => latRef = r} placeholder="lat" style={{ width: 100 }} />
        <input ref={r => lngRef = r} placeholder="lng" style={{ width: 100 }} />
        <button onClick={() => {
          if (!nameRef || !latRef || !lngRef) return;
          onAdd(nameRef.value || 'stop', latRef.value, lngRef.value);
          nameRef.value = '';
          latRef.value = '';
          lngRef.value = '';
        }}>Add</button>
      </div>
      <div>
        {stops.length === 0 && <div style={{ fontSize: 12, color: '#666' }}>No saved stops</div>}
        {stops.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <div style={{ flex: 1 }}>{s.name} — {s.lat.toFixed(6)}, {s.lng.toFixed(6)}</div>
            <button onClick={() => onSelect(s)}>Go</button>
            <button onClick={() => onRemove(s.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
