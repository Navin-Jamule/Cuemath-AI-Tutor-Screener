//
//// pages/interview.js
//import { useState, useEffect, useRef, useCallback } from 'react';
//import { useRouter } from 'next/router';
//import Head from 'next/head';
//import { v4 as uuidv4 } from 'uuid';
//import MicButton from '../components/MicButton';
//import WaveformVisualizer from '../components/WaveformVisualizer';
//import ProgressBar from '../components/ProgressBar';
//import { QUESTION_BANK } from '../Agents/questionBank';
//
//const SILENCE_THRESHOLD = 0.01;
//const SILENCE_DURATION  = 2500;
//const MAX_RECORD_MS     = 120000;
//
//function makeSession(name, subject) {
//  return {
//    sessionId:         uuidv4(),
//    candidateName:     name,
//    subject:           subject,
//    startTime:         new Date().toISOString(),
//    turns:             [],
//    currentTurnIndex:  0,
//    questionsAsked:    0,
//    followUpsUsed:     0,
//    interviewComplete: false,
//  };
//}
//
//function getSupportedMimeType() {
//  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
//  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
//}
//
//function prefetchAudio(text) {
//  return new Promise((resolve) => {
//    const audio = new Audio();
//    audio.src = `/api/tts?text=${encodeURIComponent(text.trim())}`;
//    audio.preload = 'auto';
//    audio.oncanplaythrough = () => resolve(audio);
//    audio.onerror          = () => resolve(audio);
//    setTimeout(() => resolve(audio), 8000);
//  });
//}
//
//export default function InterviewPage() {
//  const router = useRouter();
//  const { name, subject } = router.query;
//
//  const [uiState,  setUiState]  = useState('idle');
//  const [session,  setSession]  = useState(null);
//  const [aiText,   setAiText]   = useState('');
//  const [question, setQuestion] = useState('');
//  const [error,    setError]    = useState('');
//  const [analyser, setAnalyser] = useState(null);
//  const [ready,    setReady]    = useState(false);
//
//  const mediaRecorderRef = useRef(null);
//  const audioChunksRef   = useRef([]);
//  const audioCtxRef      = useRef(null);
//  const silenceTimerRef  = useRef(null);
//  const maxTimerRef      = useRef(null);
//  const streamRef        = useRef(null);
//  const ttsAudioRef      = useRef(null);
//  const sessionRef       = useRef(null);
//
//  useEffect(() => { sessionRef.current = session; }, [session]);
//
//  useEffect(() => {
//    if (!name || !subject) return;
//    const sess = makeSession(name, subject);
//    setSession(sess);
//    sessionRef.current = sess;
//    navigator.mediaDevices.getUserMedia({ audio: true })
//      .then(stream => { stream.getTracks().forEach(t => t.stop()); setReady(true); })
//      .catch(() => setError('Microphone access is required. Please allow it and refresh.'));
//  }, [name, subject]);
//
//  useEffect(() => {
//    if (!session || !ready) return;
//    const firstQuestion = QUESTION_BANK[0].mainQuestion;
//    const opening = `Hi ${session.candidateName}! Welcome to your Cuemath tutor screening. I'll ask you a few questions about teaching. Here's the first one: ${firstQuestion}`;
//    setQuestion(firstQuestion);
//    const firstTurn = { turnIndex: 0, questionAsked: firstQuestion, isFollowUp: false, transcript: '', voiceSignal: null, aiEvaluation: null, followUpAsked: null };
//    const updated = { ...session, turns: [firstTurn], questionsAsked: 1 };
//    setSession(updated);
//    sessionRef.current = updated;
//    speakText(opening);
//  // eslint-disable-next-line react-hooks/exhaustive-deps
//  }, [ready]);
//
//  const speakText = useCallback(async (text, preloadedAudio = null) => {
//    setUiState('ai_speaking');
//    setAiText(text);
//    try {
//      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ''; }
//      const audio = preloadedAudio || new Audio(`/api/tts?text=${encodeURIComponent(text.trim())}`);
//      ttsAudioRef.current = audio;
//      await new Promise((resolve, reject) => {
//        audio.onended = resolve;
//        audio.onerror = reject;
//        audio.play().catch(reject);
//      });
//    } catch (err) {
//      console.error('[speakText]', err);
//    } finally {
//      setUiState('idle');
//      setAiText('');
//    }
//  }, []);
//
//  const startRecording = useCallback(async () => {
//    if (uiState !== 'idle') return;
//    setError('');
//    try {
//      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//      streamRef.current = stream;
//      const AudioContext = window.AudioContext || window.webkitAudioContext;
//      const audioCtx = new AudioContext();
//      audioCtxRef.current = audioCtx;
//      const source = audioCtx.createMediaStreamSource(stream);
//      const analyser = audioCtx.createAnalyser();
//      analyser.fftSize = 512;
//      source.connect(analyser);
//      setAnalyser(analyser);
//      const timeDomainData = new Float32Array(analyser.fftSize);
//      let silenceStart = null;
//      const checkSilence = setInterval(() => {
//        analyser.getFloatTimeDomainData(timeDomainData);
//        const rms = Math.sqrt(timeDomainData.reduce((sum, v) => sum + v * v, 0) / timeDomainData.length);
//        if (rms < SILENCE_THRESHOLD) {
//          if (!silenceStart) silenceStart = Date.now();
//          else if (Date.now() - silenceStart > SILENCE_DURATION) { clearInterval(checkSilence); stopRecording(); }
//        } else { silenceStart = null; }
//      }, 200);
//      silenceTimerRef.current = checkSilence;
//      maxTimerRef.current = setTimeout(stopRecording, MAX_RECORD_MS);
//      const mimeType = getSupportedMimeType();
//      const recorder = new MediaRecorder(stream, { mimeType });
//      mediaRecorderRef.current = recorder;
//      audioChunksRef.current = [];
//      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
//      recorder.onstop = () => { setTimeout(() => handleRecordingStop(), 300); };
//      recorder.start(250);
//      setUiState('recording');
//    } catch (err) {
//      console.error('[startRecording]', err);
//      setError('Could not access microphone. Please check permissions.');
//    }
//  }, [uiState]);
//
//  const stopRecording = useCallback(() => {
//    clearInterval(silenceTimerRef.current);
//    clearTimeout(maxTimerRef.current);
//    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
//    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
//    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
//    setAnalyser(null);
//    setUiState('processing');
//  }, []);
//
//  const handleRecordingStop = useCallback(async () => {
//    const chunks   = audioChunksRef.current;
//    const mimeType = getSupportedMimeType();
//    const blob     = new Blob(chunks, { type: mimeType });
//    const sess     = sessionRef.current;
//    if (!sess) return;
//
//    try {
//      const formData = new FormData();
//      const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
//      formData.append('audio', blob, `audio.${ext}`);
//      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
//      const { text, voiceSignal } = await transcribeRes.json();
//
//      const currentIdx = sess.currentTurnIndex;
//      const updatedTurns = sess.turns.map((t, i) =>
//        i === currentIdx ? { ...t, transcript: text, voiceSignal, enrichedTranscript: voiceSignal?.enriched_transcript || text } : t
//      );
//      const sessWithTranscript = { ...sess, turns: updatedTurns };
//      setSession(sessWithTranscript);
//      sessionRef.current = sessWithTranscript;
//
//      const respondRes = await fetch('/api/respond', {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json' },
//        body: JSON.stringify({ session: sessWithTranscript, transcript: text, voiceSignal }),
//      });
//      const { aiEvaluation, aiResponse, nextAction, nextQuestion } = await respondRes.json();
//
//      const ttsPromise = prefetchAudio(aiResponse);
//
//      const turnsWithEval = sessWithTranscript.turns.map((t, i) =>
//        i === currentIdx ? { ...t, aiEvaluation, followUpAsked: nextAction === 'follow_up' ? nextQuestion : null } : t
//      );
//
//      if (nextAction === 'end_interview') {
//        const finalSess = { ...sessWithTranscript, turns: turnsWithEval, interviewComplete: true };
//        setSession(finalSess);
//        sessionRef.current = finalSess;
//        const preloadedAudio = await ttsPromise;
//        await speakText(aiResponse, preloadedAudio);
//        setUiState('complete');
//        await runAssessment(finalSess);
//        return;
//      }
//
//      const nextTurnIndex = sess.currentTurnIndex + 1;
//      const nextTurn = { turnIndex: nextTurnIndex, questionAsked: nextQuestion, isFollowUp: nextAction === 'follow_up', transcript: '', voiceSignal: null, aiEvaluation: null, followUpAsked: null };
//      const nextSess = {
//        ...sessWithTranscript,
//        turns: [...turnsWithEval, nextTurn],
//        currentTurnIndex: nextTurnIndex,
//        questionsAsked: nextAction === 'follow_up' ? sessWithTranscript.questionsAsked : sessWithTranscript.questionsAsked + 1,
//      };
//      setSession(nextSess);
//      sessionRef.current = nextSess;
//      setQuestion(nextQuestion);
//
//      const preloadedAudio = await ttsPromise;
//      await speakText(aiResponse, preloadedAudio);
//
//    } catch (err) {
//      console.error('[handleRecordingStop]', err);
//      setError('Something went wrong. Please try again.');
//      setUiState('idle');
//    }
//  }, [speakText]);
//
//  const runAssessment = useCallback(async (finalSess) => {
//    try {
//      const res = await fetch('/api/assess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: finalSess }) });
//      const data = await res.json();
//      console.log('[interview] Assessment complete:', data.verdict);
//      localStorage.setItem('latest_session_id', finalSess.sessionId);
//      router.push(`/thankyou?sessionId=${finalSess.sessionId}`);
//    } catch (err) {
//      console.error('[runAssessment]', err);
//      localStorage.setItem('latest_session_id', finalSess.sessionId);
//      router.push(`/thankyou?sessionId=${finalSess.sessionId}`);
//    }
//  }, [router]);
//
//  useEffect(() => {
//    return () => {
//      clearInterval(silenceTimerRef.current);
//      clearTimeout(maxTimerRef.current);
//      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
//      if (ttsAudioRef.current) ttsAudioRef.current.pause();
//    };
//  }, []);
//
//  if (!name || !subject) return <div style={{ padding: 40, color: '#1a1a2e' }}>Loading…</div>;
//
//  const questionsAsked = session?.questionsAsked ?? 0;
//
//  return (
//    <>
//      <Head>
//        <title>Interview — Cuemath</title>
//        <link rel="preconnect" href="https://fonts.googleapis.com" />
//        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
//        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
//      </Head>
//
//      <div style={styles.page}>
//        <div style={styles.marginLine} />
//        <div style={styles.shell}>
//
//          <div style={styles.header}>
//            <div style={styles.brandRow}>
//              <div style={styles.logoBg}>
//                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
//                  <path d="M14 4C14 4 18 5.5 18.5 9.5C19 13.5 16 17.5 11.5 18C7 18.5 3.5 15 4 11C4.5 7 8 4.5 11.5 5" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round"/>
//                  <path d="M11.5 5L15.5 2L17.5 6.5" fill="#1a1a2e"/>
//                  <path d="M7 15.5L5 19" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
//                  <circle cx="12" cy="10" r="1.6" fill="#f5b800"/>
//                </svg>
//              </div>
//              <span style={styles.brand}>Cuemath</span>
//            </div>
//            <ProgressBar questionsAsked={Math.min(questionsAsked, 4)} />
//          </div>
//
//          <div style={styles.card}>
//            <div style={styles.avatarWrap}>
//              <div style={{ ...styles.avatarRing, ...(uiState === 'ai_speaking' ? styles.avatarRingActive : {}) }}>
//                <div style={styles.avatarCore}>
//                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
//                    <path d="M14 4C14 4 18 5.5 18.5 9.5C19 13.5 16 17.5 11.5 18C7 18.5 3.5 15 4 11C4.5 7 8 4.5 11.5 5" stroke="#f5b800" strokeWidth="1.6" strokeLinecap="round"/>
//                    <path d="M11.5 5L15.5 2L17.5 6.5" fill="#f5b800"/>
//                    <circle cx="12" cy="10" r="1.4" fill="white"/>
//                  </svg>
//                </div>
//              </div>
//              {uiState === 'ai_speaking' && <div style={styles.speakingBadge}>Speaking…</div>}
//            </div>
//
//            <div style={styles.textZone}>
//              {uiState === 'ai_speaking' && (
//                  <>
//                    <div style={styles.aiBox}>
//                      <div style={styles.aiDot} />
//                      <p style={styles.aiText}>{aiText}</p>
//                    </div>
//                    <p style={styles.hint}>🎧 Please listen…</p>
//                  </>
//                )}
//              {uiState === 'idle' && question && (
//                <>
//                  <p style={styles.questionText}>{question}</p>
//                  <p style={styles.hint}>Tap the mic button below to answer</p>
//                </>
//              )}
//              {uiState === 'recording' && question && (
//                <>
//                  <p style={styles.questionText}>{question}</p>
//                  <p style={styles.recordingHint}>● Recording — tap mic to stop</p>
//                </>
//              )}
//              {uiState === 'processing' && <p style={styles.statusText}>Thinking…</p>}
//              {uiState === 'complete'   && <p style={styles.statusText}>Wrapping up…</p>}
//            </div>
//
//            <WaveformVisualizer active={uiState === 'recording'} analyserNode={analyser} />
//
//            {(uiState === 'idle' || uiState === 'recording') && (
//              <MicButton state={uiState} onPress={startRecording} onRelease={stopRecording} />
//            )}
//            {uiState === 'processing' && <div style={styles.spinner} />}
//            {error && <p style={styles.error}>{error}</p>}
//          </div>
//
//          <p style={styles.footer}>
//            Your answers are evaluated for communication quality, not math knowledge.
//          </p>
//        </div>
//      </div>
//
//      <style>{`
//        @keyframes ringPulse {
//          0%, 100% { box-shadow: 0 0 0 0 rgba(245,184,0,0.45); }
//          50%       { box-shadow: 0 0 0 14px rgba(245,184,0,0); }
//        }
//        @keyframes spin { to { transform: rotate(360deg); } }
//      `}</style>
//    </>
//  );
//}
//
//const styles = {
//  page: {
//    minHeight: '100vh',
//    backgroundColor: '#f5f0e8',
//    backgroundImage: `linear-gradient(#b8d4e8 1px, transparent 1px), linear-gradient(90deg, #b8d4e8 1px, transparent 1px)`,
//    backgroundSize: '28px 28px',
//    display: 'flex', alignItems: 'center', justifyContent: 'center',
//    padding: '24px', position: 'relative',
//    fontFamily: 'system-ui, -apple-system, sans-serif',
//  },
//  marginLine: {
//    position: 'fixed', left: '72px', top: 0, bottom: 0,
//    width: '1.5px', background: '#c0392b', opacity: 0.45, zIndex: 1, pointerEvents: 'none',
//  },
//  shell: {
//    width: '100%', maxWidth: '520px',
//    display: 'flex', flexDirection: 'column', gap: '24px',
//    position: 'relative', zIndex: 2,
//  },
//  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
//  brandRow: { display: 'flex', alignItems: 'center', gap: '8px' },
//  logoBg: {
//    width: '30px', height: '30px', background: '#f5b800', borderRadius: '50%',
//    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
//  },
//  brand: { fontSize: '14px', fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.2px' },
//  card: {
//    background: 'rgba(255,252,245,0.93)', border: '0.5px solid rgba(0,0,0,0.11)',
//    borderRadius: '18px', padding: '48px 40px',
//    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px',
//  },
//  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
//  avatarRing: {
//    width: '72px', height: '72px', borderRadius: '50%',
//    border: '2px solid rgba(0,0,0,0.1)',
//    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s',
//  },
//  avatarRingActive: { borderColor: '#f5b800', animation: 'ringPulse 1.5s ease-in-out infinite' },
//  avatarCore: {
//    width: '52px', height: '52px', borderRadius: '50%', background: '#1a1a2e',
//    display: 'flex', alignItems: 'center', justifyContent: 'center',
//  },
//  speakingBadge: {
//    fontSize: '11px', color: '#c9920a', fontWeight: 500, letterSpacing: '0.3px',
//    background: 'rgba(245,184,0,0.12)', padding: '3px 10px', borderRadius: '100px',
//    border: '1px solid rgba(245,184,0,0.25)',
//  },
//  textZone: {
//    minHeight: '110px', textAlign: 'center', width: '100%',
//    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center',
//  },
//
//  // ── KEY CHANGES: serif font + bigger sizes ─────────────────
//  questionText: {
//    fontFamily: "'DM Serif Display', Georgia, serif",  // ← serif, exam-paper feel
//    fontSize: '22px',                                   // ← up from 18px
//    fontWeight: 400,
//    color: '#1a1a2e',
//    lineHeight: 1.55,
//    letterSpacing: '-0.2px',
//    margin: 0,
//  },
//  aiText: {
//    fontFamily: "'DM Serif Display', Georgia, serif",  // ← serif for AI response too
//    fontSize: '17px',                                   // ← up from 15px
//    color: '#444',
//    lineHeight: 1.7,
//    fontStyle: 'italic',
//    margin: 0,
//  },
//  // ── everything below unchanged ─────────────────────────────
//  hint:          { fontSize: '13px', color: '#999', margin: 0 },
//  recordingHint: { fontSize: '13px', color: '#c0392b', margin: 0, fontWeight: 500 },
//  statusText:    { fontSize: '15px', color: '#999', margin: 0 },
//  spinner: {
//    width: '28px', height: '28px',
//    border: '2.5px solid rgba(0,0,0,0.1)', borderTop: '2.5px solid #f5b800',
//    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
//  },
//  error:  { fontSize: '13px', color: '#c0392b', textAlign: 'center', margin: 0 },
//  footer: { textAlign: 'center', fontSize: '12px', color: '#aaa' },
//};

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

// ── Cuemath logo: rocket emoji in yellow circle ───────────────────────────────
function CuemathLogo({ size = 30 }) {
  return (
    <div style={{
      width: size, height: size, background: '#f5b800', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: Math.round(size * 0.52),
    }}>
      🚀
    </div>
  );
}

export default function InterviewPage() {
  const router = useRouter();
  const { name, subject } = router.query;

  const [uiState,  setUiState]  = useState('idle');
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
      .catch(() => setError('Microphone access is required. Please allow it and refresh.'));
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
        // ✅ follow-ups don't increment questionsAsked
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
              <div style={{ ...styles.avatarRing, ...(uiState === 'ai_speaking' ? styles.avatarRingActive : {}) }}>
                <div style={styles.avatarCore}>
                  <CuemathLogo size={52} />
                </div>
              </div>
              {uiState === 'ai_speaking' && <div style={styles.speakingBadge}>Speaking…</div>}
            </div>

            {/* Text zone */}
            <div style={styles.textZone}>

              {/* ── AI speaking: blue wrapper box ── */}
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
    width: '72px', height: '72px', borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s',
  },
  avatarRingActive: { borderColor: '#f5b800', animation: 'ringPulse 1.5s ease-in-out infinite' },
  avatarCore: {
    width: '52px', height: '52px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
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

  // ── Blue AI speaking box ──────────────────────────────────────
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
    fontSize: '17px', color: '#1a3a6b', lineHeight: 1.65,
    fontStyle: 'italic', margin: 0,
  },
  // ─────────────────────────────────────────────────────────────

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