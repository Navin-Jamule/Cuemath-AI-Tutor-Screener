// components/WaveformVisualizer.jsx
import { useEffect, useRef } from 'react';

const BAR_COUNT  = 28;
const BAR_WIDTH  = 4;
const BAR_GAP    = 3;
const MAX_HEIGHT = 52;
const MIN_HEIGHT = 4;
const BAR_COLOR  = '#f5b800';

export default function WaveformVisualizer({ active, analyserNode }) {
  const containerRef = useRef(null);
  const barsRef      = useRef([]);
  const rafRef       = useRef(null);
  const phaseRef     = useRef(0);

  // Build bars once — never unmount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    barsRef.current = [];

    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = document.createElement('div');
      bar.style.cssText = `
        width: ${BAR_WIDTH}px;
        height: ${MIN_HEIGHT}px;
        background: ${BAR_COLOR};
        border-radius: 99px;
        flex-shrink: 0;
        will-change: height;
      `;
      container.appendChild(bar);
      barsRef.current.push(bar);
    }
  }, []);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (!active) {
      barsRef.current.forEach(b => { b.style.height = `${MIN_HEIGHT}px`; });
      return;
    }

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 0;
    const dataArray    = analyserNode ? new Uint8Array(bufferLength) : null;
    const center       = (BAR_COUNT - 1) / 2;
    const sigma        = BAR_COUNT / 4;

    // Only use bottom 40% of FFT bins — voice energy lives here (80Hz–3kHz)
    // Splitting these across all 28 bars means every bar responds to voice
    const usableBins = analyserNode ? Math.floor(bufferLength * 0.40) : 0;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      phaseRef.current += 0.08;

      if (analyserNode && dataArray) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      barsRef.current.forEach((bar, i) => {
        const dist     = i - center;
        const envelope = Math.exp(-(dist * dist) / (2 * sigma * sigma));

        let amplitude;

        if (analyserNode && dataArray && usableBins > 0) {
          // Logarithmic mapping: spreads bars evenly across voice frequency range
          const logMin   = Math.log(1);
          const logMax   = Math.log(usableBins + 1);
          const logPos   = logMin + (i / (BAR_COUNT - 1)) * (logMax - logMin);
          const binIndex = Math.min(Math.round(Math.exp(logPos)) - 1, usableBins - 1);

          // Average a small window for smoother bars
          const windowSize = Math.max(1, Math.floor(usableBins / BAR_COUNT));
          let sum = 0;
          for (let w = 0; w < windowSize; w++) {
            sum += dataArray[Math.min(binIndex + w, bufferLength - 1)];
          }
          const raw = (sum / windowSize) / 255;
          amplitude = raw * envelope;
        } else {
          // Fallback ripple animation when no analyser available
          const wave = Math.sin(phaseRef.current + i * 0.4) * 0.5 + 0.5;
          amplitude  = wave * envelope * 0.8;
        }

        const height = MIN_HEIGHT + amplitude * (MAX_HEIGHT - MIN_HEIGHT);
        bar.style.height = `${Math.round(height)}px`;
      });
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyserNode]);

  // Always render — hide instead of unmount to preserve bar DOM refs
  return (
    <div style={{
      ...styles.wrap,
      visibility: active ? 'visible' : 'hidden',
      height:     active ? 'auto' : 0,
      overflow:   'hidden',
    }}>
      <div ref={containerRef} style={styles.bars} aria-hidden="true" />
    </div>
  );
}

const styles = {
  wrap: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    width:          '100%',
  },
  bars: {
    display:    'flex',
    alignItems: 'center',
    gap:        `${BAR_GAP}px`,
    height:     `${MAX_HEIGHT + 16}px`,
    padding:    '4px 0',
  },
};