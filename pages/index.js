// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const STEPS = [
  {
    label: 'Question appears on screen',
    tip: "Tip: read the question fully before you tap — there's no rush.",
    desc: 'Each question is shown on screen and spoken aloud by the AI. When you are ready to answer, tap the microphone button to start recording.',
    mock: 'question',
  },
  {
    label: 'Speak your answer',
    tip: 'Tip: thinking pauses are completely normal and expected.',
    desc: 'The waveform shows the AI is listening. Speak clearly. Press "Stop" when you finish — or just pause for 2 seconds and it will stop automatically.',
    mock: 'recording',
  },
  {
    label: 'AI may ask one follow-up',
    tip: 'Tip: max 1 follow-up per question — it will never loop.',
    desc: 'After your answer the AI speaks a short response. If your answer needed more depth, it will ask one follow-up. Tap the mic again to answer it.',
    mock: 'followup',
  },
  {
    label: 'Track progress, then finish',
    tip: 'Tip: your results go only to the recruiter — you will not see a score.',
    desc: 'The bar at the top shows which question you are on. After all questions are done, you are redirected to a thank-you screen automatically.',
    mock: 'progress',
  },
];

// ── Cuemath Logo SVG ──────────────────────────────────────────────────────────
// Yellow circle + black rocket body + yellow porthole + white flames
export function CuemathLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Yellow circle background */}
      <circle cx="18" cy="18" r="18" fill="#f5b800"/>
      {/* Rocket body — black */}
      <path d="M18 6C18 6 24 9 24 17C24 22 21.5 25 18 27C14.5 25 12 22 12 17C12 9 18 6 18 6Z" fill="#1a1a2e"/>
      {/* Left fin */}
      <path d="M12 20L9 24L13 22Z" fill="#1a1a2e"/>
      {/* Right fin */}
      <path d="M24 20L27 24L23 22Z" fill="#1a1a2e"/>
      {/* Porthole window — yellow circle inside rocket */}
      <circle cx="18" cy="16" r="2.8" fill="#f5b800"/>
      {/* Flames — white */}
      <path d="M15.5 27C15.5 27 16 29.5 18 30.5C20 29.5 20.5 27 20.5 27C19.5 28 18.5 28.2 18 28.2C17.5 28.2 16.5 28 15.5 27Z" fill="white"/>
      <path d="M17 27.5C17 27.5 17.2 30 18 31C18.8 30 19 27.5 19 27.5C18.7 28.2 18.3 28.4 18 28.4C17.7 28.4 17.3 28.2 17 27.5Z" fill="white" opacity="0.8"/>
    </svg>
  );
}

// ── Tutorial mock components ──────────────────────────────────────────────────
function MockQuestion() {
  return (
    <div style={m.mockArea}>
      <span style={m.mockLabel}>QUESTION APPEARS HERE</span>
      <p style={m.mockQ}>"Can you explain what a fraction is to a 9-year-old?"</p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={m.micBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="6" y="2" width="6" height="9" rx="3" fill="white"/>
            <path d="M3 9c0 3.3 2.7 6 6 6s6-2.7 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="15" x2="9" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: '#888' }}>tap to start</span>
      </div>
    </div>
  );
}

function MockRecording() {
  const bars = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div style={m.mockArea}>
      <span style={m.mockLabel}>YOU ARE SPEAKING</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '36px' }}>
        {bars.map(i => (
          <div key={i} style={{ width: '3px', borderRadius: '2px', background: '#f5b800', height: `${8 + Math.abs(Math.sin(i * 0.7)) * 22}px` }} />
        ))}
      </div>
      <button style={m.stopBtn}>■ Stop recording</button>
    </div>
  );
}

function MockFollowup() {
  return (
    <div style={m.mockArea}>
      <span style={m.mockLabel}>AI MAY FOLLOW UP</span>
      <div style={m.aiBox}>
        <div style={m.aiDot} />
        <p style={{ fontSize: '12px', color: '#1a3a6b', lineHeight: 1.5 }}>
          "Good start! Can you add a real-life example a child would recognise?"
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ ...m.micBtn, width: '42px', height: '42px' }}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <rect x="6" y="2" width="6" height="9" rx="3" fill="white"/>
            <path d="M3 9c0 3.3 2.7 6 6 6s6-2.7 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="15" x2="9" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: '#888' }}>tap to answer follow-up</span>
      </div>
    </div>
  );
}

function MockProgress() {
  const total = 4;
  const activeIndex = 1;
  return (
    <div style={m.mockArea}>
      <span style={m.mockLabel}>PROGRESS TRACKER</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => {
          const done    = i < activeIndex;
          const current = i === activeIndex;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div style={{ width: '36px', height: '3px', margin: '0 3px', borderRadius: '2px', background: done ? '#f5b800' : 'rgba(0,0,0,0.1)' }} />
              )}
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                background: done ? '#f5b800' : 'transparent',
                border: done ? '2px solid #f5b800' : current ? '2px solid #f5b800' : '2px solid rgba(0,0,0,0.12)',
                boxShadow: current ? '0 0 0 3px rgba(245,184,0,0.2)' : 'none',
              }} />
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '12px', color: '#888' }}>Question 2 of 4</p>
      <div style={{ background: '#eef9f3', borderRadius: '10px', padding: '10px 14px', width: '100%' }}>
        <p style={{ fontSize: '12px', color: '#2e7d52', textAlign: 'center' }}>All done! Redirecting you now…</p>
      </div>
    </div>
  );
}

const MOCKS = {
  question: <MockQuestion />,
  recording: <MockRecording />,
  followup: <MockFollowup />,
  progress: <MockProgress />,
};

function Tutorial({ onClose }) {
  const [cur, setCur] = useState(0);
  const step = STEPS[cur];
  const isLast = cur === STEPS.length - 1;

  return (
    <div style={s.overlay}>
      <div style={s.tcard}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '3px', borderRadius: '100px',
              background: i < cur ? '#f5b800' : i === cur ? '#1a1a2e' : 'rgba(0,0,0,0.1)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        {MOCKS[step.mock]}
        <div>
          <p style={{ fontSize: '17px', fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.3px' }}>{step.label}</p>
          <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.65, marginTop: '7px' }}>{step.desc}</p>
          <p style={{ fontSize: '12px', color: '#c9920a', fontWeight: 500, marginTop: '6px' }}>{step.tip}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={s.skipBtn} onClick={onClose}>Skip</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...s.navBtn, visibility: cur === 0 ? 'hidden' : 'visible' }} onClick={() => setCur(c => c - 1)}>← Back</button>
            <button style={{ ...s.navBtn, ...s.navBtnPri }} onClick={() => isLast ? onClose() : setCur(c => c + 1)}>
              {isLast ? "Let's go →" : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [subjectError, setSubjectError] = useState(false);

  function handleStart() {
    const n = name.trim();
    setNameError(!n);
    setSubjectError(!subject);
    if (!n || !subject) return;
    router.push(`/interview?name=${encodeURIComponent(n)}&subject=${encodeURIComponent(subject)}`);
  }

  return (
    <>
      <Head>
        <title>Cuemath Tutor Screener</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.page}>
        <div style={s.marginLine} />
        <div style={s.content}>
          <div style={s.card}>

            <div style={s.brandRow}>
              <CuemathLogo size={36} />
              <span style={s.brandName}>Cuemath</span>
              <div style={s.divider} />
              <span style={s.brandTag}>Tutor Screener</span>
            </div>

            <div>
              <h1 style={s.heading}>Ready to interview?</h1>
              <p style={s.subheading}>
                A short AI-powered voice interview.<br />
                Speak naturally — it takes about 10 minutes.
              </p>
            </div>

            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Your name</label>
                <input
                  style={{ ...s.input, ...(nameError ? s.inputError : {}) }}
                  type="text" placeholder="e.g. Navin" value={name}
                  onChange={e => { setName(e.target.value); setNameError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleStart()}
                />
                {nameError && <span style={s.errorMsg}>Please enter your name</span>}
              </div>
              <div style={s.field}>
                <label style={s.label}>Subject applying for</label>
                <select
                  style={{ ...s.select, ...(subjectError ? s.inputError : {}) }}
                  value={subject} onChange={e => { setSubject(e.target.value); setSubjectError(false); }}
                >
                  <option value="">Select a subject</option>
                  <option>Mathematics</option>
                </select>
                {subjectError && <span style={s.errorMsg}>Please select a subject</span>}
              </div>
              <button style={s.startBtn} onClick={handleStart}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.2"/>
                  <path d="M5.5 4.5l4 2.5-4 2.5V4.5z" fill="white"/>
                </svg>
                Begin interview
              </button>
            </div>

            <button style={s.howLink} onClick={() => setShowTutorial(true)}>
              How does the interview work? →
            </button>

          </div>
        </div>
      </div>

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </>
  );
}

const m = {
  mockArea: {
    background: '#faf8f3', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '14px',
    padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '12px', position: 'relative', width: '100%',
  },
  mockLabel: {
    position: 'absolute', top: '-10px', left: '14px',
    background: '#f5b800', color: '#1a1a2e', fontSize: '10px', fontWeight: 600,
    padding: '2px 10px', borderRadius: '100px', letterSpacing: '0.4px',
  },
  mockQ: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '15px', color: '#333', textAlign: 'center', lineHeight: 1.6, maxWidth: '280px',
  },
  micBtn: {
    width: '52px', height: '52px', borderRadius: '50%', background: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  stopBtn: {
    background: '#fff', border: '1.5px solid #1a1a2e', borderRadius: '100px',
    padding: '8px 18px', fontSize: '12px', fontWeight: 500, color: '#1a1a2e',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  aiBox: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    background: '#e8f0fe', border: '1px solid rgba(66,133,244,0.2)',
    borderRadius: '12px', padding: '12px 14px', width: '100%',
  },
  aiDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#4285f4', flexShrink: 0, marginTop: '3px',
  },
};

const s = {
  page: {
    minHeight: '100vh', backgroundColor: '#f5f0e8',
    backgroundImage: `linear-gradient(#b8d4e8 1px, transparent 1px), linear-gradient(90deg, #b8d4e8 1px, transparent 1px)`,
    backgroundSize: '28px 28px', position: 'relative',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  marginLine: {
    position: 'absolute', left: '72px', top: 0, bottom: 0,
    width: '1.5px', background: '#c0392b', opacity: 0.55, zIndex: 1,
  },
  content: {
    position: 'relative', zIndex: 2, minHeight: '100vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px',
  },
  card: {
    background: 'rgba(255,252,245,0.93)', border: '0.5px solid rgba(0,0,0,0.11)',
    borderRadius: '18px', padding: '44px 48px', width: '100%', maxWidth: '460px',
    display: 'flex', flexDirection: 'column', gap: '26px',
  },
  brandRow:  { display: 'flex', alignItems: 'center', gap: '10px' },
  brandName: { fontSize: '15px', fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.2px' },
  divider:   { width: '1px', height: '16px', background: 'rgba(0,0,0,0.15)' },
  brandTag:  { fontSize: '12px', color: '#888' },
  heading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '30px', fontWeight: 400, color: '#1a1a2e',
    letterSpacing: '-0.4px', lineHeight: 1.2,
  },
  subheading: { fontSize: '14px', color: '#666', lineHeight: 1.65, marginTop: '7px' },
  form:  { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 500, color: '#444', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: {
    background: '#faf8f3', border: '1px solid rgba(0,0,0,0.13)', borderRadius: '10px',
    padding: '11px 14px', fontSize: '14px', color: '#1a1a2e', outline: 'none',
    fontFamily: 'inherit', width: '100%',
  },
  select: {
    background: '#faf8f3', border: '1px solid rgba(0,0,0,0.13)', borderRadius: '10px',
    padding: '11px 14px', fontSize: '14px', color: '#1a1a2e', outline: 'none',
    fontFamily: 'inherit', appearance: 'none', width: '100%',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', cursor: 'pointer',
  },
  inputError: { borderColor: '#e24b4a', boxShadow: '0 0 0 3px rgba(226,75,74,0.1)' },
  errorMsg:   { fontSize: '11px', color: '#e24b4a', marginTop: '-2px' },
  startBtn: {
    background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '10px',
    padding: '13px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginTop: '4px', width: '100%',
  },
  howLink: {
    fontSize: '12px', color: '#c9920a', background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', padding: 0,
    textDecoration: 'underline', textUnderlineOffset: '2px',
    display: 'block', textAlign: 'center',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(240,235,225,0.94)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
  },
  tcard: {
    background: 'rgba(255,252,245,0.98)', border: '0.5px solid rgba(0,0,0,0.11)',
    borderRadius: '18px', padding: '36px 40px', maxWidth: '480px', width: '100%',
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  skipBtn:   { fontSize: '12px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 },
  navBtn:    { background: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', color: '#444', cursor: 'pointer', fontFamily: 'inherit' },
  navBtnPri: { background: '#1a1a2e', color: '#fff', borderColor: 'transparent' },
};