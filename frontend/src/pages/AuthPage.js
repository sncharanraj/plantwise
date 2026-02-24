import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess('Account created! Please check your email to confirm.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.container}>
      {/* Left branding panel */}
      <div style={s.left}>
        <div style={s.brand}>
          <span style={s.logo}>🌿</span>
          <h1 style={s.title}>PlantWise</h1>
          <p style={s.tagline}>Grow smarter,{'\n'}not harder.</p>
          {['AI-powered plant identification', 'Complete care guides', 'Persistent follow-up chat', 'Growth journal & reminders'].map((f, i) => (
            <div key={i} style={s.feature}><span style={s.dot} /><span>{f}</span></div>
          ))}
        </div>
        <div style={s.credit}>
          Made with <span style={s.heart}>♥</span> by S N Charanraj
        </div>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <div style={s.card} className="animate-growIn">
          <h2 style={s.formTitle}>{mode === 'login' ? 'Welcome back' : 'Start growing'}</h2>
          <p style={s.sub}>{mode === 'login' ? 'Sign in to your garden' : 'Create your free account'}</p>

          {error && <div style={s.err}>{error}</div>}
          {success && <div style={s.suc}>{success}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <input className="input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={{ marginBottom: 12 }} />
            <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ marginBottom: 20 }} />
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <span className="spinner" /> : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={s.div}>
            <span style={s.line} /><span style={s.or}>or</span><span style={s.line} />
          </div>

          <button className="btn btn-secondary" onClick={signInWithGoogle} style={{ width: '100%', marginBottom: 24 }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <p style={s.sw}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button style={s.swb} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Credit shown on mobile (right panel) */}
        <div style={s.creditMobile}>
          Made with <span style={s.heart}>♥</span> by S N Charanraj
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', minHeight: '100vh' },
  left: { flex: 1, background: 'linear-gradient(135deg,#1a2e1a,#2d4a2d)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: '60px 40px 32px' },
  brand: { color: 'white' },
  logo: { fontSize: 56, display: 'block', marginBottom: 20 },
  title: { fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400, marginBottom: 16, color: 'white' },
  tagline: { fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', opacity: 0.85, marginBottom: 40, lineHeight: 1.4, whiteSpace: 'pre-line', color: 'white' },
  feature: { display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9, fontSize: 16, marginBottom: 12, color: 'white' },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#7fb896', flexShrink: 0 },
  credit: { color: 'rgba(255,255,255,0.45)', fontSize: 13, letterSpacing: 0.4, paddingTop: 8 },
  creditMobile: { color: 'var(--text-light)', fontSize: 13, marginTop: 24, textAlign: 'center', letterSpacing: 0.4 },
  heart: { color: '#e74c3c', fontSize: 14, margin: '0 3px' },
  right: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--warm-white)' },
  card: { background: 'white', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(26,46,26,0.12)', border: '1px solid var(--border)' },
  formTitle: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, marginBottom: 8 },
  sub: { color: 'var(--text-light)', marginBottom: 28, fontSize: 15 },
  form: { display: 'flex', flexDirection: 'column' },
  err: { background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--danger)', fontSize: 14 },
  suc: { background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--success)', fontSize: 14 },
  div: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  line: { flex: 1, height: 1, background: 'var(--border)' },
  or: { color: 'var(--text-light)', fontSize: 13 },
  sw: { textAlign: 'center', color: 'var(--text-mid)', fontSize: 14 },
  swb: { background: 'none', border: 'none', color: 'var(--sage)', fontWeight: 600, cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }
};
