// pages/interview.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import MicButton from '../components/MicButton';
import WaveformVisualizer from '../components/WaveformVisualizer';
import ProgressBar from '../components/ProgressBar';
import { QUESTION_BANK } from '../Agents/questionBank';

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION  = 2500;
const MAX_RECORD_MS     = 120000;

function makeSession(name, subject) {
  return {
    sessionId:         uuidv4(),
    candidateName:     name,
    subject:           subject,
    startTime:         new Date().toISOString(),
    turns:             [],
    currentTurnIndex:  0,
    questionsAsked:    0,
    followUpsUsed:     0,
    interviewComplete: false,
  };
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

function prefetchAudio(text) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = `/api/tts?text=${encodeURIComponent(text.trim())}`;
    audio.preload = 'auto';
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror          = () => resolve(audio);
    setTimeout(() => resolve(audio), 8000);
  });
}

// ── Cuemath Logo: yellow circle + black rocket + yellow porthole + white flames
function CuemathLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Yellow circle */}
      <circle cx="18" cy="18" r="18" fill="#f5b800"/>
      {/* Rocket body — black */}
      <path d="M18 6C18 6 24 9 24 17C24 22 21.5 25 18 27C14.5 25 12 22 12 17C12 9 18 6 18 6Z" fill="#1a1a2e"/>
      {/* Left fin — black */}
      <path d="M12 20L9 24L13 22Z" fill="#1a1a2e"/>
      {/* Right fin — black */}
      <path d="M24 20L27 24L23 22Z" fill="#1a1a2e"/>
      {/* Porthole window — yellow */}
      <circle cx="18" cy="16" r="2.8" fill="#f5b800"/>
      {/* Flames — white */}
      <path d="M15.5 27C15.5 27 16.2 30 18 31C19.8 30 20.5 27 20.5 27C19.3 28.2 18.6 28.5 18 28.5C17.4 28.5 16.7 28.2 15.5 27Z" fill="white"/>
      <path d="M16.8 27.2C16.8 27.2 17.1 29.5 18 30.5C18.9 29.5 19.2 27.2 19.2 27.2C18.8 28 18.4 28.2 18 28.2C17.6 28.2 17.2 28 16.8 27.2Z" fill="white" opacity="0.7"/>
    </svg>
  );
}

// ── Large avatar logo for the interview card centre ───────────────────────────
function CuemathAvatarLogo({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      {/* Yellow circle */}
      <circle cx="26" cy="26" r="26" fill="#f5b800"/>
      {/* Rocket body */}
      <path d="M26 8C26 8 34 12 34 24C34 31 31 35.5 26 38C21 35.5 18 31 18 24C18 12 26 8 26 8Z" fill="#1a1a2e"/>
      {/* Left fin */}
      <path d="M18 28L14 34L19 31Z" fill="#1a1a2e"/>
      {/* Right fin */}
      <path d="M34 28L38 34L33 31Z" fill="#1a1a2e"/>
      {/* Porthole window — yellow */}
      <circle cx="26" cy="22" r="4" fill="#f5b800"/>
      {/* Flames — white */}
      <path d="M22 38C22 38 23.5 43 26 44.5C28.5 43 30 38 30 38C28.3 39.8 27.2 40.2 26 40.2C24.8 40.2 23.7 39.8 22 38Z" fill="white"/>
      <path d="M24 38.5C24 38.5 24.5 42 26 43C27.5 42 28 38.5 28 38.5C27.4 40 26.7 40.4 26 40.4C25.3 40.4 24.6 40 24 38.5Z" fill="white" opacity="0.7"/>
    </svg>
  );
}

export default function InterviewPage() {
  const router = useRouter();
  const { name, subject } = router.query;

  const [uiState,  setUiState]  = useState('loading');
  const [session,  setSession]  = useState(null);
  const [aiText,   setAiText]   = useState('');
  const [question, setQuestion] = useState('');
  const [error,    setError]    = useState('');
  const [analyser, setAnalyser] = useState(null);
  const [ready,    setReady]    = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const audioCtxRef      = useRef(null);
  const silenceTimerRef  = useRef(null);
  const maxTimerRef      = useRef(null);
  const streamRef        = useRef(null);
  const ttsAudioRef      = useRef(null);
  const sessionRef       = useRef(null);

  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    if (!name || !subject) return;
    const sess = makeSession(name, subject);
    setSession(sess);
    sessionRef.current = sess;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => { stream.getTracks().forEach(t => t.stop()); setReady(true); })
      .catch(() => {
        setError('Microphone access is required. Please allow it and refresh.');
        setUiState('idle');
      });
  }, [name, subject]);

  useEffect(() => {
    if (!session || !ready) return;
    const firstQuestion = QUESTION_BANK[0].mainQuestion;
    const opening = `Hi ${session.candidateName}! Welcome to your Cuemath tutor screening. I'll ask you a few questions about teaching. Here's the first one: ${firstQuestion}`;
    setQuestion(firstQuestion);
    const firstTurn = { turnIndex: 0, questionAsked: firstQuestion, isFollowUp: false, transcript: '', voiceSignal: null, aiEvaluation: null, followUpAsked: null };
    const updated = { ...session, turns: [firstTurn], questionsAsked: 1 };
    setSession(updated);
    sessionRef.current = updated;
    speakText(opening);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const speakText = useCallback(async (text, preloadedAudio = null) => {
    setUiState('ai_speaking');
    setAiText(text);
    try {
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ''; }
      const audio = preloadedAudio || new Audio(`/api/tts?text=${encodeURIComponent(text.trim())}`);
      ttsAudioRef.current = audio;
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
    } catch (err) {
      console.error('[speakText]', err);
    } finally {
      setUiState('idle');
      setAiText('');
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (uiState !== 'idle') return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      setAnalyser(analyser);
      const timeDomainData = new Float32Array(analyser.fftSize);
      let silenceStart = null;
      const checkSilence = setInterval(() => {
        analyser.getFloatTimeDomainData(timeDomainData);
        const rms = Math.sqrt(timeDomainData.reduce((sum, v) => sum + v * v, 0) / timeDomainData.length);
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION) { clearInterval(checkSilence); stopRecording(); }
        } else { silenceStart = null; }
      }, 200);
      silenceTimerRef.current = checkSilence;
      maxTimerRef.current = setTimeout(stopRecording, MAX_RECORD_MS);
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { setTimeout(() => handleRecordingStop(), 300); };
      recorder.start(250);
      setUiState('recording');
    } catch (err) {
      console.error('[startRecording]', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [uiState]);

  const stopRecording = useCallback(() => {
    clearInterval(silenceTimerRef.current);
    clearTimeout(maxTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    setAnalyser(null);
    setUiState('processing');
  }, []);

  const handleRecordingStop = useCallback(async () => {
    const chunks   = audioChunksRef.current;
    const mimeType = getSupportedMimeType();
    const blob     = new Blob(chunks, { type: mimeType });
    const sess     = sessionRef.current;
    if (!sess) return;

    try {
      const formData = new FormData();
      const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
      formData.append('audio', blob, `audio.${ext}`);
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const { text, voiceSignal } = await transcribeRes.json();

      const currentIdx = sess.currentTurnIndex;
      const updatedTurns = sess.turns.map((t, i) =>
        i === currentIdx ? { ...t, transcript: text, voiceSignal, enrichedTranscript: voiceSignal?.enriched_transcript || text } : t
      );
      const sessWithTranscript = { ...sess, turns: updatedTurns };
      setSession(sessWithTranscript);
      sessionRef.current = sessWithTranscript;

      const respondRes = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessWithTranscript, transcript: text, voiceSignal }),
      });
      const { aiEvaluation, aiResponse, nextAction, nextQuestion } = await respondRes.json();

      const ttsPromise = prefetchAudio(aiResponse);

      const turnsWithEval = sessWithTranscript.turns.map((t, i) =>
        i === currentIdx ? { ...t, aiEvaluation, followUpAsked: nextAction === 'follow_up' ? nextQuestion : null } : t
      );

      if (nextAction === 'end_interview') {
        const finalSess = { ...sessWithTranscript, turns: turnsWithEval, interviewComplete: true };
        setSession(finalSess);
        sessionRef.current = finalSess;
        const preloadedAudio = await ttsPromise;
        await speakText(aiResponse, preloadedAudio);
        setUiState('complete');
        await runAssessment(finalSess);
        return;
      }

      const nextTurnIndex = sess.currentTurnIndex + 1;
      const nextTurn = { turnIndex: nextTurnIndex, questionAsked: nextQuestion, isFollowUp: nextAction === 'follow_up', transcript: '', voiceSignal: null, aiEvaluation: null, followUpAsked: null };
      const nextSess = {
        ...sessWithTranscript,
        turns: [...turnsWithEval, nextTurn],
        currentTurnIndex: nextTurnIndex,
        questionsAsked: nextAction === 'follow_up'
          ? sessWithTranscript.questionsAsked
          : Math.min(sessWithTranscript.questionsAsked + 1, 4),
      };
      setSession(nextSess);
      sessionRef.current = nextSess;
      setQuestion(nextQuestion);

      const preloadedAudio = await ttsPromise;
      await speakText(aiResponse, preloadedAudio);

    } catch (err) {
      console.error('[handleRecordingStop]', err);
      setError('Something went wrong. Please try again.');
      setUiState('idle');
    }
  }, [speakText]);

  const runAssessment = useCallback(async (finalSess) => {
    try {
      const res = await fetch('/api/assess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: finalSess }) });
      const data = await res.json();
      console.log('[interview] Assessment complete:', data.verdict);
      localStorage.setItem('latest_session_id', finalSess.sessionId);
      router.push(`/thankyou?sessionId=${finalSess.sessionId}`);
    } catch (err) {
      console.error('[runAssessment]', err);
      localStorage.setItem('latest_session_id', finalSess.sessionId);
      router.push(`/thankyou?sessionId=${finalSess.sessionId}`);
    }
  }, [router]);

  useEffect(() => {
    return () => {
      clearInterval(silenceTimerRef.current);
      clearTimeout(maxTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (ttsAudioRef.current) ttsAudioRef.current.pause();
    };
  }, []);

  if (!name || !subject) return <div style={{ padding: 40, color: '#1a1a2e' }}>Loading…</div>;

  const questionsAsked = session?.questionsAsked ?? 0;

  return (
    <>
      <Head>
        <title>Interview — Cuemath</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>

      <div style={styles.page}>
        <div style={styles.marginLine} />
        <div style={styles.shell}>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.brandRow}>
              <CuemathLogo size={30} />
              <span style={styles.brand}>Cuemath</span>
            </div>
            <ProgressBar questionsAsked={Math.min(questionsAsked, 4)} />
          </div>

          {/* Main card */}
          <div style={styles.card}>

            {/* Avatar */}
            <div style={styles.avatarWrap}>
              <div style={{
                ...styles.avatarRing,
                ...(uiState === 'ai_speaking' ? styles.avatarRingActive : {}),
              }}>
                <CuemathAvatarLogo size={52} />
              </div>
              {uiState === 'ai_speaking' && <div style={styles.speakingBadge}>Speaking…</div>}
            </div>

            {/* Text zone */}
            <div style={styles.textZone}>

              {uiState === 'loading' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={styles.spinner} />
                  <p style={styles.statusText}>Getting ready…</p>
                </div>
              )}

              {uiState === 'ai_speaking' && (
                <>
                  <div style={styles.aiBox}>
                    <div style={styles.aiDot} />
                    <p style={styles.aiText}>{aiText}</p>
                  </div>
                  <p style={styles.hint}>🎧 Please listen…</p>
                </>
              )}

              {uiState === 'idle' && question && (
                <>
                  <p style={styles.questionText}>{question}</p>
                  <p style={styles.hint}>Tap the mic button below to answer</p>
                </>
              )}
              {uiState === 'recording' && question && (
                <>
                  <p style={styles.questionText}>{question}</p>
                  <p style={styles.recordingHint}>● Recording — tap mic to stop</p>
                </>
              )}
              {uiState === 'processing' && <p style={styles.statusText}>Thinking…</p>}
              {uiState === 'complete'   && <p style={styles.statusText}>Wrapping up…</p>}
            </div>

            <WaveformVisualizer active={uiState === 'recording'} analyserNode={analyser} />

            {(uiState === 'idle' || uiState === 'recording') && (
              <MicButton state={uiState} onPress={startRecording} onRelease={stopRecording} />
            )}
            {uiState === 'processing' && <div style={styles.spinner} />}
            {error && <p style={styles.error}>{error}</p>}
          </div>

          <p style={styles.footer}>
            Your answers are evaluated for communication quality, not math knowledge.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,184,0,0.45); }
          50%       { box-shadow: 0 0 0 14px rgba(245,184,0,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

const styles = {
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
  shell: {
    width: '100%', maxWidth: '520px',
    display: 'flex', flexDirection: 'column', gap: '24px',
    position: 'relative', zIndex: 2,
  },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  brand:    { fontSize: '14px', fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.2px' },
  card: {
    background: 'rgba(255,252,245,0.93)', border: '0.5px solid rgba(0,0,0,0.11)',
    borderRadius: '18px', padding: '48px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px',
  },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  avatarRing: {
    width: '68px', height: '68px', borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'border-color 0.3s', overflow: 'hidden',
  },
  avatarRingActive: {
    borderColor: '#f5b800',
    animation: 'ringPulse 1.5s ease-in-out infinite',
  },
  speakingBadge: {
    fontSize: '11px', color: '#c9920a', fontWeight: 500, letterSpacing: '0.3px',
    background: 'rgba(245,184,0,0.12)', padding: '3px 10px', borderRadius: '100px',
    border: '1px solid rgba(245,184,0,0.25)',
  },
  textZone: {
    minHeight: '110px', textAlign: 'center', width: '100%',
    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center',
  },
  aiBox: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    background: '#e8f0fe', border: '1px solid rgba(66,133,244,0.2)',
    borderRadius: '14px', padding: '16px 18px',
    width: '100%', textAlign: 'left',
  },
  aiDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#4285f4', flexShrink: 0, marginTop: '6px',
  },
  aiText: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '17px', color: '#1a3a6b', lineHeight: 1.65, fontStyle: 'italic', margin: 0,
  },
  questionText: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '22px', fontWeight: 400, color: '#1a1a2e',
    lineHeight: 1.55, letterSpacing: '-0.2px', margin: 0,
  },
  hint:          { fontSize: '13px', color: '#999', margin: 0 },
  recordingHint: { fontSize: '13px', color: '#c0392b', margin: 0, fontWeight: 500 },
  statusText:    { fontSize: '15px', color: '#999', margin: 0 },
  spinner: {
    width: '28px', height: '28px',
    border: '2.5px solid rgba(0,0,0,0.1)', borderTop: '2.5px solid #f5b800',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  error:  { fontSize: '13px', color: '#c0392b', textAlign: 'center', margin: 0 },
  footer: { textAlign: 'center', fontSize: '12px', color: '#aaa' },
};