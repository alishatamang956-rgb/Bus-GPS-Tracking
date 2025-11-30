import { useEffect, useRef } from 'react';
import MinuteVideo from './MinuteVideo';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapView({ positions, destination, onMapClick, fullScreen, onExitFullScreen, videoOverlayConfig = null }) {
  // ETA tuning factors — increase these to make ETA more conservative
  const ROUTE_SAFETY_FACTOR = 1.25; // was 1.15
  const FALLBACK_SAFETY_FACTOR = 1.5; // was 1.3
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const destRef = useRef(null);
  const routeRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', { center: [0, 0], zoom: 2 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
      layerRef.current = L.layerGroup().addTo(mapRef.current);

      // click to set destination (notify parent)
      mapRef.current.on('click', (e) => {
        if (onMapClick) onMapClick(e.latlng);
      });
    }
    // when map is created or fullScreen toggled, give Leaflet a chance to resize
    if (mapRef.current) {
      setTimeout(() => { try { mapRef.current.invalidateSize(); } catch (e) {} }, 200);
    }
  }, [onMapClick]);

  function computeEtaText(lastPosition, destLatLng) {
    // compute conservative average speed (m/s) from recent positions
    // We'll compute per-segment speeds, filter outliers, use median speed, and apply a safety factor.
    const MAX_REASONABLE_SPEED = 50; // m/s (~180 km/h)
    const MIN_SEGMENT_TIME = 1; // seconds
    const SEGMENTS = Math.min(8, positions.length - 1);
    if (SEGMENTS < 1) return 'ETA: unknown (not enough data)';

    const recent = positions.slice(- (SEGMENTS + 1));
    const speeds = [];
    for (let i = 1; i < recent.length; i++) {
      const a = recent[i - 1];
      const b = recent[i];
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      if (isNaN(ta) || isNaN(tb) || tb <= ta) continue;
      const dt = (tb - ta) / 1000.0;
      if (dt < MIN_SEGMENT_TIME) continue;
      const d = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
      const s = d / dt;
      if (!isFinite(s) || s <= 0 || s > MAX_REASONABLE_SPEED) continue;
      speeds.push({ speed: s, dt });
    }
    if (speeds.length === 0) return 'ETA: unknown (insufficient movement)';

    // compute median speed weighted by time to reduce impact of short bursts
    speeds.sort((x, y) => x.speed - y.speed);
    const mid = Math.floor(speeds.length / 2);
    const medianSpeed = speeds.length % 2 === 1 ? speeds[mid].speed : (speeds[mid - 1].speed + speeds[mid].speed) / 2;

    // as a fallback compute weighted average
    const totalTime = speeds.reduce((s, v) => s + v.dt, 0);
    const weightedAvg = speeds.reduce((acc, v) => acc + v.speed * v.dt, 0) / totalTime;

    const chosenSpeed = Math.max(0.1, Math.min(weightedAvg, Math.max(medianSpeed, weightedAvg)));

    // apply safety multiplier to avoid underestimation (adjustable)
    const SAFETY_FACTOR = FALLBACK_SAFETY_FACTOR;

    const distToDest = haversineMeters(lastPosition.latitude, lastPosition.longitude, destLatLng.lat, destLatLng.lng);
    const seconds = (distToDest / chosenSpeed) * SAFETY_FACTOR;
    const etaDate = new Date(Date.parse(lastPosition.timestamp) + seconds * 1000);

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `ETA: ${mins}m ${secs}s (arrive ~ ${etaDate.toISOString()})`;
  }
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // prepare coordinates in chronological order
    const coords = [];
    positions.forEach((p) => {
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return;
      coords.push([p.latitude, p.longitude]);
      // small circle marker for each point
  const circle = L.circleMarker([p.latitude, p.longitude], { radius: 4, color: '#0077ff' });
  const popup = `<div><strong>${p.device_id || 'device'}</strong><br/>${p.timestamp}<br/>${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}</div>`;
  circle.bindPopup(popup);
  if (onMapClick) circle.on('click', (e) => onMapClick(e.latlng));
  layer.addLayer(circle);
    });

    // draw polyline path
    if (coords.length > 0) {
  const poly = L.polyline(coords, { color: 'blue', weight: 3 }).addTo(layer);
  if (onMapClick) poly.on('click', (e) => onMapClick(e.latlng));
      // highlight last point
      const last = coords[coords.length - 1];
      L.circleMarker(last, { radius: 6, color: 'red', fillOpacity: 0.9 }).addTo(layer);

      try {
        map.fitBounds(poly.getBounds(), { maxZoom: 16, padding: [20, 20] });
      } catch (e) {
        map.setView(coords[0], 14);
      }
    }

    // If a destination prop exists, draw it and compute route
    (async () => {
      if (!destination) return;

      // remove previous dest and route
      if (destRef.current) destRef.current.remove();
      if (routeRef.current) routeRef.current.remove();

      const destLatLng = L.latLng(destination.lat, destination.lng);
      destRef.current = L.marker(destLatLng, { title: 'Destination' }).addTo(map);

      // if we have a last known position, try route-aware ETA using OSRM public API
      if (positions.length > 0) {
        const last = positions[positions.length - 1];
        if (typeof last.latitude === 'number' && typeof last.longitude === 'number') {
          const srcLon = last.longitude;
          const srcLat = last.latitude;
          const dstLon = destination.lng;
          const dstLat = destination.lat;

          try {
            const url = `https://router.project-osrm.org/route/v1/driving/${srcLon},${srcLat};${dstLon},${dstLat}?overview=full&geometries=geojson`;
            const resp = await fetch(url);
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.routes && data.routes.length > 0) {
                const r = data.routes[0];
                const coordsGeo = r.geometry.coordinates.map(c => [c[1], c[0]]);
                routeRef.current = L.polyline(coordsGeo, { color: 'green', weight: 4 }).addTo(map);
                if (onMapClick) routeRef.current.on('click', (e) => onMapClick(e.latlng));
                // Apply a safety factor to OSRM duration to be conservative
                const ROUTE_SAFETY = ROUTE_SAFETY_FACTOR; // 25% buffer for traffic/uncertainty (tunable)
                const adjustedDuration = r.duration * ROUTE_SAFETY;
                const arriveAt = new Date(Date.parse(last.timestamp) + adjustedDuration * 1000);
                destRef.current.bindPopup(`<div><strong>Destination</strong><br/>${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}<br/>ETA (route): ${formatDuration(adjustedDuration)} (~ ${arriveAt.toISOString()})</div>`).openPopup();
                map.fitBounds(routeRef.current.getBounds(), { maxZoom: 16, padding: [20, 20] });
                return;
              }
            }
          } catch (e) {
            console.warn('OSRM route failed', e);
          }

          // fallback to straight-line if OSRM fails
          routeRef.current = L.polyline([[last.latitude, last.longitude], [destination.lat, destination.lng]], { color: 'red', dashArray: '4 6' }).addTo(map);
          if (onMapClick) routeRef.current.on('click', (e) => onMapClick(e.latlng));
          const etaText = computeEtaText(last, destLatLng);
          destRef.current.bindPopup(`<div><strong>Destination</strong><br/>${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}<br/>${etaText}</div>`).openPopup();
        }
      }
    })();
  }, [positions, destination]);

  // choose style depending on fullscreen
  const style = fullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 } : { height: 480, width: '100%' };

  // wrapper style used to position overlay relative to the map
  const wrapperStyle = fullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998 } : { position: 'relative', width: '100%', height: 480 };

  return (
    <div>
      {fullScreen && (
        <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 10000 }}>
          <button onClick={() => { if (onExitFullScreen) onExitFullScreen(); }}>Close</button>
        </div>
      )}
      <div style={wrapperStyle}>
        <div id="map" style={{ width: '100%', height: '100%' }} />
        {videoOverlayConfig && (
          <MinuteVideo
            videoSrc={videoOverlayConfig.videoSrc}
            intervalMs={videoOverlayConfig.intervalMs}
            showDurationMs={videoOverlayConfig.showDurationMs}
            alignToMinute={videoOverlayConfig.alignToMinute}
            muted={videoOverlayConfig.muted}
            fullscreenOverlay={videoOverlayConfig.fullscreenOverlay ? videoOverlayConfig.fullscreenOverlay : false}
            containerRelative={true}
          />
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}
