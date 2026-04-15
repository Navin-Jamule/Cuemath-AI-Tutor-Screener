//// pages/recruiter/report/[sessionId].js
//
//import { useEffect, useState, useCallback } from 'react';
//import Head from 'next/head';
//import { useRouter } from 'next/router';
//import ScoreCard from '../../../components/ScoreCard';
//
//export default function RecruiterReport() {
//  const router = useRouter();
//  const { sessionId, secret } = router.query;
//
//  const [report,      setReport]      = useState(null);
//  const [error,       setError]       = useState('');
//  const [loading,     setLoading]     = useState(true);
//  const [downloading, setDownloading] = useState(false);
//
//  useEffect(() => {
//    if (!router.isReady) return;
//    if (!sessionId || !secret) {
//      setError('Missing session ID or secret.');
//      setLoading(false);
//      return;
//    }
//    fetch(`/api/report/${sessionId}?secret=${secret}`)
//      .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
//      .then(data => { setReport(data); setLoading(false); })
//      .catch(err => { setError(`Report not found or access denied. (${err.message})`); setLoading(false); });
//  }, [router.isReady, sessionId, secret]);
//
//  const downloadPDF = useCallback(async () => {
//    if (!report) return;
//    setDownloading(true);
//    try {
//      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
//      const { jsPDF } = window.jspdf;
//      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
//
//      const W = 210;
//      const margin = 20;
//      const col = W - margin * 2;
//      let y = 20;
//
//      doc.setFillColor(15, 15, 25);
//      doc.rect(0, 0, W, 30, 'F');
//      doc.setTextColor(255, 255, 255);
//      doc.setFontSize(16);
//      doc.setFont('helvetica', 'bold');
//      doc.text('Cuemath', margin, 13);
//      doc.setFontSize(9);
//      doc.setFont('helvetica', 'normal');
//      doc.setTextColor(160, 160, 180);
//      doc.text('Tutor Screening Report — Confidential', margin, 21);
//
//      const verdictColor = { Pass: [34,197,94], Hold: [245,158,11], Reject: [239,68,68] }[report.verdict] || [120,120,140];
//      doc.setFillColor(...verdictColor);
//      doc.roundedRect(W - margin - 28, 8, 28, 13, 3, 3, 'F');
//      doc.setTextColor(255,255,255);
//      doc.setFontSize(10);
//      doc.setFont('helvetica', 'bold');
//      doc.text(report.verdict || '', W - margin - 14, 17, { align: 'center' });
//      y = 40;
//
//      doc.setTextColor(30, 30, 40);
//      doc.setFontSize(18);
//      doc.setFont('helvetica', 'bold');
//      doc.text(report.candidateName || 'Candidate', margin, y);
//      y += 7;
//      doc.setFontSize(10);
//      doc.setFont('helvetica', 'normal');
//      doc.setTextColor(100, 100, 120);
//      doc.text(`${report.subject || ''} · Completed ${report.completedAt ? new Date(report.completedAt).toLocaleDateString() : ''}`, margin, y);
//      y += 10;
//
//      doc.setFillColor(245, 245, 250);
//      doc.roundedRect(margin, y, col, 22, 4, 4, 'F');
//      const pills = [
//        { label: 'Final Score', value: report.final_score?.toFixed(1), color: verdictColor },
//        { label: 'Content',     value: report.content_score?.toFixed(1), color: [108,99,255] },
//        { label: 'Voice',       value: report.voice_score?.toFixed(1),   color: [108,99,255] },
//      ];
//      pills.forEach((p, i) => {
//        const px = margin + 10 + i * 55;
//        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...p.color);
//        doc.text(String(p.value || ''), px, y + 13);
//        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 140);
//        doc.text(p.label, px, y + 19);
//      });
//      y += 30;
//
//      if (report.summary) {
//        doc.setFillColor(235, 235, 250);
//        const summaryLines = doc.splitTextToSize(report.summary, col - 10);
//        const summaryH = summaryLines.length * 5 + 10;
//        doc.roundedRect(margin, y, col, summaryH, 3, 3, 'F');
//        doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(60, 60, 80);
//        doc.text(summaryLines, margin + 5, y + 7);
//        y += summaryH + 8;
//      }
//
//      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 140);
//      doc.text('DIMENSION SCORES', margin, y);
//      y += 5;
//      const dims = [
//        { key: 'explanation_quality', label: 'Explanation quality', weight: '30%' },
//        { key: 'clarity_simplicity',  label: 'Clarity + simplicity', weight: '25%' },
//        { key: 'engagement',          label: 'Engagement',           weight: '20%' },
//        { key: 'fluency',             label: 'Fluency',               weight: '15%' },
//        { key: 'confidence',          label: 'Confidence',            weight: '10%' },
//      ];
//      dims.forEach(dim => {
//        const d = report.scores?.[dim.key];
//        if (!d) return;
//        const score = d.score || 0;
//        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 40);
//        doc.text(dim.label, margin, y + 4);
//        doc.setFontSize(8); doc.setTextColor(140, 140, 160);
//        doc.text(dim.weight, margin + 60, y + 4);
//        doc.setFillColor(220, 220, 230);
//        doc.roundedRect(margin + 75, y, 80, 4, 2, 2, 'F');
//        const barColor = score >= 8 ? [34,197,94] : score >= 6 ? [108,99,255] : score >= 4 ? [245,158,11] : [239,68,68];
//        doc.setFillColor(...barColor);
//        doc.roundedRect(margin + 75, y, (score / 10) * 80, 4, 2, 2, 'F');
//        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 40);
//        doc.text(`${score}/10`, W - margin, y + 4, { align: 'right' });
//        if (d.evidence) {
//          doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 140, 160);
//          doc.text(`"${d.evidence}"`, margin, y + 9);
//          y += 14;
//        } else { y += 10; }
//      });
//      y += 4;
//
//      if (report.feedback?.length) {
//        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 140);
//        doc.text('RECRUITER NOTES', margin, y);
//        y += 6;
//        report.feedback.forEach(f => {
//          const isStrength = f.toLowerCase().startsWith('strength');
//          const color = isStrength ? [34,197,94] : [245,158,11];
//          const label = isStrength ? 'STRENGTH' : 'IMPROVE';
//          const text  = f.replace(/^(strength|improve):\s*/i, '');
//          doc.setFillColor(...color.map(c => Math.min(c + 180, 255)));
//          doc.roundedRect(margin, y, col, 14, 2, 2, 'F');
//          doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color);
//          doc.text(label, margin + 3, y + 5);
//          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 50);
//          const lines = doc.splitTextToSize(text, col - 30);
//          doc.text(lines[0], margin + 22, y + 9);
//          y += 16;
//        });
//      }
//
//      doc.setFontSize(8); doc.setTextColor(160, 160, 180);
//      doc.text('Generated by Cuemath AI Hiring · Confidential — Do not share with candidate', W / 2, 290, { align: 'center' });
//
//      const filename = `cuemath_report_${report.candidateName?.replace(/\s+/g, '_') || 'candidate'}_${new Date().toISOString().slice(0,10)}.pdf`;
//      doc.save(filename);
//    } catch (err) {
//      console.error('[downloadPDF]', err);
//      alert('PDF generation failed. Please try again.');
//    }
//    setDownloading(false);
//  }, [report]);
//
//  return (
//    <>
//      <Head><title>Recruiter Report — Cuemath</title></Head>
//
//      <div style={styles.page}>
//        <div style={styles.marginLine} />
//
//        <div style={styles.content}>
//
//          {/* Header */}
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
//            <span style={styles.tag}>Recruiter Report</span>
//          </div>
//
//          {loading && <p style={styles.msg}>Loading report…</p>}
//
//          {error && (
//            <div style={styles.errorCard}>
//              <p style={{ color: '#c0392b', fontWeight: 500 }}>Access denied</p>
//              <p style={styles.msg}>{error}</p>
//            </div>
//          )}
//
//          {report && (
//            <ScoreCard
//              report={report}
//              candidate={report.candidateName || 'Candidate'}
//              subject={report.subject || ''}
//            />
//          )}
//
//          {report && (
//            <div style={styles.downloadWrap}>
//              <button
//                onClick={downloadPDF}
//                disabled={downloading}
//                style={{ ...styles.downloadBtn, ...(downloading ? styles.downloadBtnDisabled : {}) }}
//              >
//                {downloading ? 'Generating PDF…' : '⬇ Download PDF Report'}
//              </button>
//            </div>
//          )}
//
//          <p style={styles.footer}>
//            This report is confidential. Do not share with the candidate.
//          </p>
//        </div>
//      </div>
//    </>
//  );
//}
//
//function loadScript(src) {
//  return new Promise((resolve, reject) => {
//    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
//    const s = document.createElement('script');
//    s.src = src; s.onload = resolve; s.onerror = reject;
//    document.head.appendChild(s);
//  });
//}
//
//const styles = {
//  page: {
//    minHeight: '100vh',
//    backgroundColor: '#f5f0e8',
//    backgroundImage: `
//      linear-gradient(#b8d4e8 1px, transparent 1px),
//      linear-gradient(90deg, #b8d4e8 1px, transparent 1px)
//    `,
//    backgroundSize: '28px 28px',
//    padding: '40px 24px',
//    position: 'relative',
//    fontFamily: 'system-ui, -apple-system, sans-serif',
//  },
//  marginLine: {
//    position: 'fixed',
//    left: '72px',
//    top: 0,
//    bottom: 0,
//    width: '1.5px',
//    background: '#c0392b',
//    opacity: 0.45,
//    zIndex: 1,
//    pointerEvents: 'none',
//  },
//  content: {
//    position: 'relative',
//    zIndex: 2,
//    maxWidth: '680px',
//    margin: '0 auto',
//    display: 'flex',
//    flexDirection: 'column',
//    gap: '24px',
//  },
//  header: {
//    display: 'flex',
//    alignItems: 'center',
//    justifyContent: 'space-between',
//  },
//  brandRow: {
//    display: 'flex',
//    alignItems: 'center',
//    gap: '8px',
//  },
//  logoBg: {
//    width: '32px',
//    height: '32px',
//    background: '#f5b800',
//    borderRadius: '50%',
//    display: 'flex',
//    alignItems: 'center',
//    justifyContent: 'center',
//    flexShrink: 0,
//  },
//  brand: {
//    fontSize: '15px',
//    fontWeight: 500,
//    color: '#1a1a2e',
//    letterSpacing: '-0.2px',
//  },
//  tag: {
//    fontSize: '12px',
//    color: '#888',
//    background: 'rgba(255,252,245,0.9)',
//    border: '1px solid rgba(0,0,0,0.1)',
//    padding: '4px 12px',
//    borderRadius: '100px',
//  },
//  msg: {
//    fontSize: '14px',
//    color: '#666',
//  },
//  errorCard: {
//    background: 'rgba(255,252,245,0.93)',
//    border: '0.5px solid rgba(0,0,0,0.11)',
//    borderRadius: '18px',
//    padding: '40px',
//    display: 'flex',
//    flexDirection: 'column',
//    gap: '12px',
//  },
//  downloadWrap: {
//    display: 'flex',
//    justifyContent: 'center',
//    paddingTop: '8px',
//  },
//  downloadBtn: {
//    background: '#1a1a2e',
//    color: '#ffffff',
//    border: 'none',
//    borderRadius: '10px',
//    padding: '12px 36px',
//    fontSize: '14px',
//    fontWeight: 500,
//    cursor: 'pointer',
//    letterSpacing: '0.2px',
//    fontFamily: 'inherit',
//  },
//  downloadBtnDisabled: {
//    opacity: 0.5,
//    cursor: 'not-allowed',
//  },
//  footer: {
//    textAlign: 'center',
//    fontSize: '12px',
//    color: '#bbb',
//    paddingBottom: '40px',
//  },
//};

// pages/recruiter/report/[sessionId].js

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ScoreCard from '../../../components/ScoreCard';

export default function RecruiterReport() {
  const router = useRouter();
  const { sessionId, secret } = router.query;

  const [report,      setReport]      = useState(null);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!sessionId || !secret) {
      setError('Missing session ID or secret.');
      setLoading(false);
      return;
    }
    fetch(`/api/report/${sessionId}?secret=${secret}`)
      .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then(data => { setReport(data); setLoading(false); })
      .catch(err => { setError(`Report not found or access denied. (${err.message})`); setLoading(false); });
  }, [router.isReady, sessionId, secret]);

  const downloadPDF = useCallback(async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = 210;
      const margin = 20;
      const col = W - margin * 2;
      let y = 20;

      doc.setFillColor(15, 15, 25);
      doc.rect(0, 0, W, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Cuemath', margin, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 180);
      doc.text('Tutor Screening Report — Confidential', margin, 21);

      const verdictColor = { Pass: [34,197,94], Hold: [245,158,11], Reject: [239,68,68] }[report.verdict] || [120,120,140];
      doc.setFillColor(...verdictColor);
      doc.roundedRect(W - margin - 28, 8, 28, 13, 3, 3, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(report.verdict || '', W - margin - 14, 17, { align: 'center' });
      y = 40;

      doc.setTextColor(30, 30, 40);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(report.candidateName || 'Candidate', margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 120);
      doc.text(`${report.subject || ''} · Completed ${report.completedAt ? new Date(report.completedAt).toLocaleDateString() : ''}`, margin, y);
      y += 10;

      doc.setFillColor(245, 245, 250);
      doc.roundedRect(margin, y, col, 22, 4, 4, 'F');
      const pills = [
        { label: 'Final Score', value: report.final_score?.toFixed(1), color: verdictColor },
        { label: 'Content',     value: report.content_score?.toFixed(1), color: [108,99,255] },
        { label: 'Voice',       value: report.voice_score?.toFixed(1),   color: [108,99,255] },
      ];
      pills.forEach((p, i) => {
        const px = margin + 10 + i * 55;
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...p.color);
        doc.text(String(p.value || ''), px, y + 13);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 140);
        doc.text(p.label, px, y + 19);
      });
      y += 30;

      if (report.summary) {
        doc.setFillColor(235, 235, 250);
        const summaryLines = doc.splitTextToSize(report.summary, col - 10);
        const summaryH = summaryLines.length * 5 + 10;
        doc.roundedRect(margin, y, col, summaryH, 3, 3, 'F');
        doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(60, 60, 80);
        doc.text(summaryLines, margin + 5, y + 7);
        y += summaryH + 8;
      }

      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 140);
      doc.text('DIMENSION SCORES', margin, y);
      y += 5;
      const dims = [
        { key: 'explanation_quality', label: 'Explanation quality', weight: '30%' },
        { key: 'clarity_simplicity',  label: 'Clarity + simplicity', weight: '25%' },
        { key: 'engagement',          label: 'Engagement',           weight: '20%' },
        { key: 'fluency',             label: 'Fluency',               weight: '15%' },
        { key: 'confidence',          label: 'Confidence',            weight: '10%' },
      ];
      dims.forEach(dim => {
        const d = report.scores?.[dim.key];
        if (!d) return;
        const score = d.score || 0;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 40);
        doc.text(dim.label, margin, y + 4);
        doc.setFontSize(8); doc.setTextColor(140, 140, 160);
        doc.text(dim.weight, margin + 60, y + 4);
        doc.setFillColor(220, 220, 230);
        doc.roundedRect(margin + 75, y, 80, 4, 2, 2, 'F');
        const barColor = score >= 8 ? [34,197,94] : score >= 6 ? [108,99,255] : score >= 4 ? [245,158,11] : [239,68,68];
        doc.setFillColor(...barColor);
        doc.roundedRect(margin + 75, y, (score / 10) * 80, 4, 2, 2, 'F');
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 40);
        doc.text(`${score}/10`, W - margin, y + 4, { align: 'right' });
        if (d.evidence) {
          doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 140, 160);
          doc.text(`"${d.evidence}"`, margin, y + 9);
          y += 14;
        } else { y += 10; }
      });
      y += 4;

      if (report.feedback?.length) {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 140);
        doc.text('RECRUITER NOTES', margin, y);
        y += 6;
        report.feedback.forEach(f => {
          const isStrength = f.toLowerCase().startsWith('strength');
          const color = isStrength ? [34,197,94] : [245,158,11];
          const label = isStrength ? 'STRENGTH' : 'IMPROVE';
          const text  = f.replace(/^(strength|improve):\s*/i, '');
          doc.setFillColor(...color.map(c => Math.min(c + 180, 255)));
          doc.roundedRect(margin, y, col, 14, 2, 2, 'F');
          doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color);
          doc.text(label, margin + 3, y + 5);
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 50);
          const lines = doc.splitTextToSize(text, col - 30);
          doc.text(lines[0], margin + 22, y + 9);
          y += 16;
        });
      }

      doc.setFontSize(8); doc.setTextColor(160, 160, 180);
      doc.text('Generated by Cuemath AI Hiring · Confidential — Do not share with candidate', W / 2, 290, { align: 'center' });

      const filename = `cuemath_report_${report.candidateName?.replace(/\s+/g, '_') || 'candidate'}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('[downloadPDF]', err);
      alert('PDF generation failed. Please try again.');
    }
    setDownloading(false);
  }, [report]);

  return (
    <>
      <Head>
        <title>Recruiter Report — Cuemath</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>

      <div style={styles.page}>
        <div style={styles.marginLine} />

        <div style={styles.content}>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.brandRow}>
              <div style={styles.logoBg}>
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <path d="M14 4C14 4 18 5.5 18.5 9.5C19 13.5 16 17.5 11.5 18C7 18.5 3.5 15 4 11C4.5 7 8 4.5 11.5 5" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M11.5 5L15.5 2L17.5 6.5" fill="#1a1a2e"/>
                  <path d="M7 15.5L5 19" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="12" cy="10" r="1.6" fill="#f5b800"/>
                </svg>
              </div>
              <span style={styles.brand}>Cuemath</span>
            </div>
            <span style={styles.tag}>Recruiter Report</span>
          </div>

          {/* ── KEY CHANGE: serif page title ── */}
          <h1 style={styles.pageTitle}>Candidate Report</h1>

          {loading && <p style={styles.msg}>Loading report…</p>}

          {error && (
            <div style={styles.errorCard}>
              <p style={{ color: '#c0392b', fontWeight: 500 }}>Access denied</p>
              <p style={styles.msg}>{error}</p>
            </div>
          )}

          {report && (
            <ScoreCard
              report={report}
              candidate={report.candidateName || 'Candidate'}
              subject={report.subject || ''}
            />
          )}

          {report && (
            <div style={styles.downloadWrap}>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                style={{ ...styles.downloadBtn, ...(downloading ? styles.downloadBtnDisabled : {}) }}
              >
                {downloading ? 'Generating PDF…' : '⬇ Download PDF Report'}
              </button>
            </div>
          )}

          <p style={styles.footer}>
            This report is confidential. Do not share with the candidate.
          </p>
        </div>
      </div>
    </>
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f0e8',
    backgroundImage: `
      linear-gradient(#b8d4e8 1px, transparent 1px),
      linear-gradient(90deg, #b8d4e8 1px, transparent 1px)
    `,
    backgroundSize: '28px 28px',
    padding: '40px 24px',
    position: 'relative',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  marginLine: {
    position: 'fixed',
    left: '72px',
    top: 0,
    bottom: 0,
    width: '1.5px',
    background: '#c0392b',
    opacity: 0.45,
    zIndex: 1,
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '680px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoBg: {
    width: '32px',
    height: '32px',
    background: '#f5b800',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brand: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1a1a2e',
    letterSpacing: '-0.2px',
  },
  tag: {
    fontSize: '12px',
    color: '#888',
    background: 'rgba(255,252,245,0.9)',
    border: '1px solid rgba(0,0,0,0.1)',
    padding: '4px 12px',
    borderRadius: '100px',
  },

  // ── KEY CHANGE: serif page title ──
  pageTitle: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '28px',
    fontWeight: 400,
    color: '#1a1a2e',
    letterSpacing: '-0.3px',
    margin: 0,
  },

  msg: { fontSize: '14px', color: '#666' },
  errorCard: {
    background: 'rgba(255,252,245,0.93)',
    border: '0.5px solid rgba(0,0,0,0.11)',
    borderRadius: '18px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  downloadWrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8px',
  },
  downloadBtn: {
    background: '#1a1a2e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 36px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.2px',
    fontFamily: 'inherit',
  },
  downloadBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#bbb',
    paddingBottom: '40px',
  },
};