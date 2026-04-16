// components/MicButton.jsx
import { useCallback } from 'react';

export default function MicButton({ state, onPress, onRelease }) {
  const isRecording = state === 'recording';
  const isDisabled  = state === 'processing' || state === 'ai_speaking' || state === 'complete';

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    if (isRecording) onRelease();
    else onPress();
  }, [isDisabled, isRecording, onPress, onRelease]);

  if (isRecording) {
    return (
      <button style={styles.stopBtn} onClick={handleClick} aria-label="Stop recording">
        <span style={styles.stopSquare} />
        Stop recording
      </button>
    );
  }

  return (
    <div style={styles.wrap}>
      {!isDisabled && <span style={styles.pulse} aria-hidden="true" />}
      {!isDisabled && <span style={{ ...styles.pulse, animationDelay: '0.7s' }} aria-hidden="true" />}
      <button
        style={{ ...styles.micBtn, ...(isDisabled ? styles.micBtnDisabled : {}) }}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label="Start recording"
      >
        <MicIcon />
      </button>
      <p style={styles.hint}>
        {state === 'idle'        ? 'Tap to answer'  : ''}
        {state === 'processing'  ? 'Processing…'    : ''}
        {state === 'ai_speaking' ? 'Please listen…' : ''}
      </p>
      <style>{`
        @keyframes micPulse {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', position: 'relative' },
  pulse: {
    position: 'absolute', top: '50%', left: '50%',
    width: '80px', height: '80px', borderRadius: '50%',
    border: '2px solid rgba(245,184,0,0.5)',
    animation: 'micPulse 1.4s ease-out infinite', pointerEvents: 'none',
  },
  // ── LIGHT mic button ──
  micBtn: {
    width: '80px', height: '80px', borderRadius: '50%',
    background: '#faf8f3',
    border: '1.5px solid rgba(0,0,0,0.13)',
    color: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', position: 'relative', zIndex: 1, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  micBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  hint: { fontSize: '13px', color: '#aaa', letterSpacing: '0.2px', minHeight: '20px', margin: 0 },
  stopBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(255,252,245,0.95)', border: '1.5px solid #1a1a2e',
    borderRadius: '100px', padding: '10px 24px', fontSize: '13px',
    fontWeight: 500, color: '#1a1a2e', cursor: 'pointer',
    fontFamily: 'inherit', letterSpacing: '0.2px',
  },
  stopSquare: { width: '9px', height: '9px', borderRadius: '2px', background: '#1a1a2e', flexShrink: 0 },
};