import React, { useEffect, useRef, useState } from 'react';

export default function MinuteVideo({ videoSrc, intervalMs = 30000, showDurationMs = 15000, alignToMinute = true, muted = false, fullscreenOverlay = true, containerRelative = false }) {
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const snoozeRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    function triggerPlayback() {
      const now = Date.now();
      const snoozeUntil = snoozeRef.current || 0;
      if (snoozeUntil && now < snoozeUntil) return; // respect snooze/close
      setVisible(true);
      const vid = videoRef.current;
      if (vid) {
        vid.currentTime = 0;
        // attempt to play with requested `muted` setting; many browsers block autoplay with sound.
        vid.play().then(() => {
          setAutoplayBlocked(false);
        }).catch((err) => {
          // if autoplay fails with sound, try a muted fallback so the user at least sees the ad
          setAutoplayBlocked(true);
          try { vid.muted = true; } catch (e) {}
          vid.play().catch(() => {});
        });
      }
      // hide after showDurationMs
      timerRef.current = setTimeout(() => {
        if (vid) { try { vid.pause(); } catch (e) {} }
        setVisible(false);
      }, showDurationMs);
    }

    const now = Date.now();
    const next = alignToMinute ? (intervalMs - (now % intervalMs)) : intervalMs;
    // schedule first trigger
    const starter = setTimeout(() => {
      triggerPlayback();
      // schedule recurring interval
      intervalRef.current = setInterval(triggerPlayback, intervalMs);
    }, next);

    return () => {
      clearTimeout(starter);
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [videoSrc, intervalMs, showDurationMs, alignToMinute]);

  if (!videoSrc) return null;
  if (!visible) return null;

  const overlayStyle = fullscreenOverlay
    ? { position: containerRelative ? 'absolute' : 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }
    : { position: containerRelative ? 'absolute' : 'fixed', right: 12, bottom: 12, zIndex: 10000, pointerEvents: 'auto' };

  const videoStyle = fullscreenOverlay
    ? { width: '100%', height: '100%', objectFit: 'cover' }
    : { display: 'block', width: '70%', height: 'auto', maxWidth: '900px', maxHeight: '70vh', objectFit: 'contain' };

  function closeNow(snoozeMs = 60000) { // default snooze 60s
    // hide immediately and snooze for snoozeMs
    setVisible(false);
    snoozeRef.current = Date.now() + snoozeMs;
  }

  function enableSoundByUserGesture() {
    const vid = videoRef.current;
    if (!vid) return;
    try { vid.muted = false; } catch (e) {}
    vid.play().then(() => {
      setAutoplayBlocked(false);
    }).catch((err) => {
      console.warn('User-play attempt failed:', err);
    });
  }

  return (
    <div style={overlayStyle} aria-hidden={!visible}>
      {visible && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={videoRef} src={videoSrc} muted={muted} playsInline autoPlay controls={false} style={videoStyle} />
          <button onClick={() => closeNow(intervalMs)} aria-label="Close video" style={{ position: 'absolute', right: 12, top: 12, zIndex: 10001, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4 }}>Close</button>
          {autoplayBlocked && (
            <button onClick={() => enableSoundByUserGesture()} aria-label="Enable sound" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10001, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4 }}>Enable sound</button>
          )}
        </div>
      )}
    </div>
  );
}
