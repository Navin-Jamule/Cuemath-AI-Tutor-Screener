// components/ProgressBar.jsx
export default function ProgressBar({ questionsAsked, total = 4 }) {
  const activeIndex = Math.min(questionsAsked - 1, total - 1);

  return (
    <div style={styles.wrap} role="progressbar" aria-valuenow={questionsAsked} aria-valuemax={total}>
      <div style={styles.track}>
        {Array.from({ length: total }).map((_, i) => {
          const done    = i < activeIndex;
          const current = i === activeIndex;
          return (
            <div key={i} style={styles.segWrap}>
              {i > 0 && (
                <div style={{
                  ...styles.connector,
                  background: done || current ? '#f5b800' : 'rgba(0,0,0,0.1)',
                }} />
              )}
              <div style={{
                ...styles.dot,
                ...(done    ? styles.dotDone    : {}),
                ...(current ? styles.dotCurrent : {}),
              }} />
            </div>
          );
        })}
      </div>
      <p style={styles.label}>
        {questionsAsked > total
          ? 'Interview complete'
          : `Question ${Math.max(questionsAsked, 1)} of ${total}`}
      </p>
    </div>
  );
}

const styles = {
  wrap:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  track: { display: 'flex', alignItems: 'center' },
  segWrap: { display: 'flex', alignItems: 'center' },
  dot: {
    width: '10px', height: '10px', borderRadius: '50%',
    background: 'rgba(0,0,0,0.08)', border: '2px solid rgba(0,0,0,0.12)',
    transition: 'all 0.3s', flexShrink: 0,
  },
  dotDone:    { background: '#f5b800', border: '2px solid #f5b800' },
  dotCurrent: { background: 'transparent', border: '2px solid #f5b800', boxShadow: '0 0 0 3px rgba(245,184,0,0.2)' },
  connector: { width: '44px', height: '3px', margin: '0 3px', borderRadius: '2px', transition: 'background 0.3s' },
  label: { fontSize: '12px', color: '#aaa', letterSpacing: '0.3px', margin: 0 },
};