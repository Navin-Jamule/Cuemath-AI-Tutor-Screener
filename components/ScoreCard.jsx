// components/ScoreCard.jsx
export default function ScoreCard({ report, candidate, subject }) {
  if (!report) return null;

  const { scores, content_score, voice_score, final_score, verdict, summary, feedback } = report;

  const verdictColor = {
    Pass:   '#16a34a',
    Hold:   '#d97706',
    Reject: '#dc2626',
  }[verdict] || '#666';

  const verdictBg = {
    Pass:   'rgba(34,197,94,0.1)',
    Hold:   'rgba(245,158,11,0.1)',
    Reject: 'rgba(239,68,68,0.1)',
  }[verdict] || 'rgba(0,0,0,0.05)';

  const DIMENSIONS = [
    { key: 'explanation_quality', label: 'Explanation quality', weight: '30%' },
    { key: 'clarity_simplicity',  label: 'Clarity + simplicity', weight: '25%' },
    { key: 'engagement',          label: 'Engagement',           weight: '20%' },
    { key: 'fluency',             label: 'Fluency',               weight: '15%' },
    { key: 'confidence',          label: 'Confidence',            weight: '10%' },
  ];

  return (
    <div style={styles.card}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          {/* ── KEY CHANGE: serif candidate name, larger ── */}
          <h2 style={styles.name}>{candidate}</h2>
          <p style={styles.meta}>
            {subject} · Screened {new Date().toLocaleDateString()}
          </p>
        </div>
        <div style={{ ...styles.verdictBadge, background: verdictBg, color: verdictColor, border: `1px solid ${verdictColor}33` }}>
          {verdict}
        </div>
      </div>

      {/* Score summary */}
      <div style={styles.scoreRow}>
        <ScorePill label="Final score" value={final_score} size="lg" color={verdictColor} />
        <ScorePill label="Content"     value={content_score} />
        <ScorePill label="Voice"       value={voice_score} />
      </div>

      {/* Summary */}
      {summary && (
        <div style={styles.summary}>
          {/* ── KEY CHANGE: serif summary text ── */}
          <p style={styles.summaryText}>{summary}</p>
        </div>
      )}

      {/* Dimension scores */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Dimension scores</h3>
        <div style={styles.dimensions}>
          {DIMENSIONS.map(dim => {
            const d = scores?.[dim.key];
            if (!d) return null;
            return (
              <div key={dim.key} style={styles.dimRow}>
                <div style={styles.dimLeft}>
                  <span style={styles.dimLabel}>{dim.label}</span>
                  <span style={styles.dimWeight}>{dim.weight}</span>
                </div>
                <div style={styles.dimRight}>
                  <div style={styles.barWrap}>
                    <div style={{ ...styles.bar, width: `${(d.score / 10) * 100}%`, background: scoreColor(d.score) }} />
                  </div>
                  <span style={styles.dimScore}>{d.score}/10</span>
                </div>
                {d.evidence && <p style={styles.evidence}>"{d.evidence}"</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {feedback?.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Recruiter notes</h3>
          <div style={styles.feedbackList}>
            {feedback.map((f, i) => {
              const isStrength = f.toLowerCase().startsWith('strength');
              return (
                <div key={i} style={{ ...styles.feedbackItem, borderLeft: `2px solid ${isStrength ? '#16a34a' : '#d97706'}` }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isStrength ? '#16a34a' : '#d97706', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {isStrength ? 'Strength' : 'Improve'}
                  </span>
                  <p style={styles.feedbackText}>{f.replace(/^(strength|improve):\s*/i, '')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScorePill({ label, value, size = 'sm', color }) {
  return (
    <div style={styles.pill}>
      <span style={{ ...styles.pillValue, fontSize: size === 'lg' ? '32px' : '22px', color: color || '#1a1a2e' }}>
        {value?.toFixed ? value.toFixed(1) : value}
      </span>
      <span style={styles.pillLabel}>{label}</span>
    </div>
  );
}

function scoreColor(score) {
  if (score >= 8) return '#16a34a';
  if (score >= 6) return '#6c63ff';
  if (score >= 4) return '#d97706';
  return '#dc2626';
}

const styles = {
  card: {
    background: 'rgba(255,252,245,0.93)',
    border: '0.5px solid rgba(0,0,0,0.11)',
    borderRadius: '18px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  // ── KEY CHANGE: serif candidate name ──
  name: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '26px',       // ← up from 22px
    fontWeight: 400,        // ← serif looks better at regular weight
    letterSpacing: '-0.3px',
    color: '#1a1a2e',
  },
  meta: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  verdictBadge: {
    padding: '6px 16px',
    borderRadius: '100px',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  scoreRow: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-end',
  },
  pill: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  pillValue: {
    fontWeight: 600,
    letterSpacing: '-1px',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  pillLabel: {
    fontSize: '11px',
    color: '#888',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  summary: {
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.07)',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  // ── KEY CHANGE: serif summary ──
  summaryText: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '16px',
    fontStyle: 'italic',
    color: '#444',
    lineHeight: 1.7,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#999',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  dimensions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  dimRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dimLeft: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  dimLabel: {
    fontSize: '13px',
    color: '#1a1a2e',
    fontWeight: 500,
  },
  dimWeight: {
    fontSize: '11px',
    color: '#aaa',
  },
  dimRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  barWrap: {
    flex: 1,
    height: '6px',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: '100px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '100px',
    transition: 'width 0.6s ease',
  },
  dimScore: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1a1a2e',
    minWidth: '36px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  evidence: {
    fontSize: '12px',
    color: '#aaa',
    fontStyle: 'italic',
    paddingLeft: '4px',
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  feedbackItem: {
    paddingLeft: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  feedbackText: {
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.6,
  },
};