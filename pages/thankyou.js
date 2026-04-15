// pages/thankyou.js
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function ThankYouPage() {
  const router = useRouter();
  const [visible,    setVisible]    = useState(false);
  const [sessionId,  setSessionId]  = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [password,   setPassword]   = useState('');
  const [pwError,    setPwError]    = useState('');

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    if (!router.isReady) return;
    const sid = router.query.sessionId || localStorage.getItem('latest_session_id') || '';
    setSessionId(sid);
  }, [router.isReady, router.query.sessionId]);

  function handleAdminClick() { setShowPrompt(true); setPwError(''); setPassword(''); }

  function handlePasswordSubmit(e) {
    e.preventDefault();
    if (password === 'cuemath2026') {
      window.open(`/recruiter/report/${sessionId}?secret=cuemath2026`, '_blank');
      setShowPrompt(false);
    } else {
      setPwError('Incorrect password.');
    }
  }

  return (
    <>
      <Head>
        <title>Thank You — Cuemath</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.page}>
        <div style={s.marginLine} />

        <div style={{
          ...s.card,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>

          <div style={s.logoRow}>
            <div style={s.logoBg}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M14 4C14 4 18 5.5 18.5 9.5C19 13.5 16 17.5 11.5 18C7 18.5 3.5 15 4 11C4.5 7 8 4.5 11.5 5" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M11.5 5L15.5 2L17.5 6.5" fill="#1a1a2e"/>
                <path d="M7 15.5L5 19" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="12" cy="10" r="1.6" fill="#f5b800"/>
              </svg>
            </div>
            <span style={s.brandName}>Cuemath</span>
          </div>

          <div style={s.checkCircle}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>

          {/* ── KEY CHANGE: serif heading, larger ── */}
          <h1 style={s.h1}>Interview Complete</h1>
          <p style={s.sub}>Thank you for completing your Cuemath tutor screening.</p>
          <p style={s.body}>Our team will review your responses and get back to you within 2–3 business days.</p>

          <div style={s.divider} />

          {sessionId && (
            <button onClick={handleAdminClick} style={s.adminBtn}>🔒 Report (Admin only)</button>
          )}

          {showPrompt && (
            <div style={s.promptBox}>
              <p style={s.promptLabel}>Enter admin password</p>
              <form onSubmit={handlePasswordSubmit} style={s.promptForm}>
                <input
                  type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setPwError(''); }}
                  placeholder="Password" style={s.promptInput} autoFocus
                />
                <button type="submit" style={s.promptSubmit}>View Report</button>
              </form>
              {pwError && <p style={s.pwError}>{pwError}</p>}
              <button onClick={() => setShowPrompt(false)} style={s.promptCancel}>Cancel</button>
            </div>
          )}

          <p style={s.foot}>Powered by Cuemath AI Hiring</p>
        </div>
      </div>
    </>
  );
}

const s = {
  page: {
    minHeight: '100vh', backgroundColor: '#f5f0e8',
    backgroundImage: `linear-gradient(#b8d4e8 1px, transparent 1px), linear-gradient(90deg, #b8d4e8 1px, transparent 1px)`,
    backgroundSize: '28px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', position: 'relative', fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  marginLine: {
    position: 'fixed', left: '72px', top: 0, bottom: 0,
    width: '1.5px', background: '#c0392b', opacity: 0.45, zIndex: 1, pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 2, width: '100%', maxWidth: '440px',
    background: 'rgba(255,252,245,0.93)', border: '0.5px solid rgba(0,0,0,0.11)',
    borderRadius: '18px', padding: '48px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  logoBg: {
    width: '32px', height: '32px', background: '#f5b800', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  brandName: { fontSize: '14px', fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.2px' },
  checkCircle: {
    width: '72px', height: '72px', borderRadius: '50%',
    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px',
  },

  // ── KEY CHANGE: serif heading ──
  h1: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '28px',       // ← up from 24px
    fontWeight: 400,        // ← serif at regular weight
    letterSpacing: '-0.3px',
    color: '#1a1a2e',
    margin: 0,
  },
  sub:  { fontSize: '15px', color: '#555', margin: 0 },
  body: { fontSize: '14px', color: '#777', lineHeight: 1.7, margin: 0 },
  divider: { width: '100%', height: '1px', background: 'rgba(0,0,0,0.08)', margin: '4px 0' },
  adminBtn: {
    background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '10px', padding: '10px 20px', fontSize: '13px', color: '#555',
    cursor: 'pointer', letterSpacing: '0.2px', fontFamily: 'inherit',
  },
  promptBox: {
    width: '100%', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column',
    gap: '12px', alignItems: 'center',
  },
  promptLabel: { fontSize: '13px', color: '#444', fontWeight: 500, margin: 0 },
  promptForm: { display: 'flex', gap: '8px', width: '100%' },
  promptInput: {
    flex: 1, background: 'rgba(255,252,245,0.9)', border: '1px solid rgba(0,0,0,0.13)',
    borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#1a1a2e',
    outline: 'none', fontFamily: 'inherit',
  },
  promptSubmit: {
    background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  },
  pwError:      { fontSize: '12px', color: '#c0392b', margin: 0 },
  promptCancel: { fontSize: '12px', color: '#aaa', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 },
  foot:         { fontSize: '12px', color: '#bbb', marginTop: '8px' },
};