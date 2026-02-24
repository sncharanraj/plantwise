export default function Footer() {
  return (
    <div style={styles.footer}>
      Made with <span style={styles.heart}>♥</span> by S N Charanraj
    </div>
  );
}

const styles = {
  footer: {
    textAlign: 'center',
    padding: '20px 24px 32px',
    color: 'var(--text-light)',
    fontSize: 13,
    letterSpacing: 0.4,
    borderTop: '1px solid var(--border)',
    marginTop: 40,
    background: 'var(--warm-white)'
  },
  heart: {
    color: '#e74c3c',
    fontSize: 14,
    margin: '0 3px'
  }
};
