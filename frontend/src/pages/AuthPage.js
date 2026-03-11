import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { lang, switchLang, t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess(t.accountCreated);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const LANGS = [{ code:'en', label:'EN' }, { code:'hi', label:'हि' }, { code:'kn', label:'ಕ' }];

  return (
    <div style={s.page}>
      {/* Left — botanical art panel */}
      <div style={s.left}>
        <div style={s.leftInner}>
          {/* Decorative botanical circles */}
          <div style={s.circle1}/>
          <div style={s.circle2}/>
          <div style={s.circle3}/>

          {/* Big leaf illustration (SVG) */}
          <div style={s.botanical}>
            <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',maxWidth:300,opacity:0.9}}>
              {/* Main leaf */}
              <path d="M160 380 C160 380 40 280 60 160 C80 40 160 20 160 20 C160 20 240 40 260 160 C280 280 160 380 160 380Z" fill="#5a6e44" opacity="0.7"/>
              <path d="M160 380 C160 380 40 280 60 160 C80 40 160 20 160 20" fill="none" stroke="#8fa672" strokeWidth="2" opacity="0.6"/>
              {/* Veins */}
              <path d="M160 20 L160 380" stroke="#3d4a2e" strokeWidth="2.5" opacity="0.5"/>
              <path d="M160 120 L100 180" stroke="#3d4a2e" strokeWidth="1.5" opacity="0.4"/>
              <path d="M160 160 L90 230" stroke="#3d4a2e" strokeWidth="1.5" opacity="0.4"/>
              <path d="M160 200 L95 275" stroke="#3d4a2e" strokeWidth="1.5" opacity="0.35"/>
              <path d="M160 120 L220 180" stroke="#3d4a2e" strokeWidth="1.5" opacity="0.4"/>
              <path d="M160 160 L230 230" stroke="#3d4a2e" strokeWidth="1.5" opacity="0.4"/>
              <path d="M160 200 L225 275" stroke="#3d4a2e" strokeWidth="1.5" opacity="0.35"/>
              {/* Small accent leaf */}
              <path d="M80 300 C80 300 40 260 50 220 C60 180 80 170 80 170 C80 170 100 180 110 220 C120 260 80 300 80 300Z" fill="#c1623f" opacity="0.55"/>
              <path d="M240 250 C240 250 210 220 215 195 C220 170 240 165 240 165 C240 165 260 170 265 195 C270 220 240 250 240 250Z" fill="#c9952a" opacity="0.5"/>
              {/* Dots */}
              <circle cx="70" cy="100" r="6" fill="#8fa672" opacity="0.5"/>
              <circle cx="260" cy="130" r="4" fill="#c1623f" opacity="0.4"/>
              <circle cx="50" cy="320" r="5" fill="#c9952a" opacity="0.45"/>
              <circle cx="280" cy="300" r="7" fill="#5a6e44" opacity="0.35"/>
            </svg>
          </div>

          <div style={s.brandWrap}>
            <div style={s.logoRow}>
              <span style={s.logoLeaf}>🌿</span>
              <span style={s.logoText}>PlantWise</span>
            </div>
            <p style={s.tagline}>{t.tagline}</p>
            <div style={s.features}>
              {[t.featureIdentify, t.featureGuides, t.featureChat, t.featureJournal].map((f,i) => (
                <div key={i} style={s.feat}>
                  <div style={s.featDot}/>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={s.credit}>Made with ♥ by S N Charanraj</p>
        </div>
      </div>

      {/* Right — form */}
      <div style={s.right}>
        {/* Language switcher */}
        <div style={s.topBar}>
          <div style={s.langRow}>
            {LANGS.map(l => (
              <button key={l.code} style={{...s.langBtn,...(lang===l.code?s.langActive:{})}} onClick={() => switchLang(l.code)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.formWrap} className="animate-fadeUp">
          {/* Mode toggle pill */}
          <div style={s.modePill}>
            <button style={{...s.modeBtn,...(mode==='login'?s.modeBtnOn:{})}} onClick={() => { setMode('login'); setError(''); }}>
              {t.signIn}
            </button>
            <button style={{...s.modeBtn,...(mode==='signup'?s.modeBtnOn:{})}} onClick={() => { setMode('signup'); setError(''); }}>
              {t.createAccount}
            </button>
          </div>

          <h1 style={s.formTitle}>{mode === 'login' ? t.welcomeBack : t.startGrowing}</h1>
          <p style={s.formSub}>{mode === 'login' ? t.signInToGarden : t.createFreeAccount}</p>

          {error   && <div style={s.err}>{error}</div>}
          {success && <div style={s.suc}>{success}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.inputWrap}>
              <label style={s.label}>{t.emailAddress}</label>
              <input className="input" type="email" placeholder={t.emailPlaceholder}
                value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
            <div style={s.inputWrap}>
              <label style={s.label}>{t.passwordPlaceholder}</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',marginTop:8,padding:'15px 24px',fontSize:16,borderRadius:14}}>
              {loading ? <span className="spinner" style={{borderTopColor:'#fff',borderColor:'rgba(255,255,255,0.25)'}}/>
                       : mode === 'login' ? t.signIn : t.createAccount}
            </button>
          </form>

          <div style={s.orRow}>
            <span style={s.orLine}/><span style={s.orText}>or</span><span style={s.orLine}/>
          </div>

          <button className="btn btn-secondary" onClick={signInWithGoogle}
            style={{width:'100%',borderRadius:14,padding:'14px 24px',gap:10}}>
            <GoogleIcon/>
            {t.continueWithGoogle}
          </button>
        </div>

        <p style={s.creditMobile}>Made with ♥ by S N Charanraj</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

const s = {
  page: { display:'flex', minHeight:'100vh', background:'var(--bg)' },

  /* Left botanical panel */
  left: {
    width: '45%', minHeight: '100vh',
    background: 'linear-gradient(160deg, #3d4a2e 0%, #5a6e44 50%, #3d4a2e 100%)',
    position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    '@media(max-width:768px)': { display:'none' },
  },
  leftInner: { position:'relative', flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'48px 44px', zIndex:2 },
  circle1: { position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,0.04)', zIndex:1 },
  circle2: { position:'absolute', bottom:40, left:-60, width:220, height:220, borderRadius:'50%', background:'rgba(193,98,63,0.15)', zIndex:1 },
  circle3: { position:'absolute', top:'40%', right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(201,149,42,0.12)', zIndex:1 },
  botanical: { position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', width:'55%', zIndex:1, opacity:0.8 },
  brandWrap: { zIndex:2 },
  logoRow:   { display:'flex', alignItems:'center', gap:12, marginBottom:20 },
  logoLeaf:  { fontSize:36 },
  logoText:  { fontFamily:'var(--font-display)', fontSize:38, fontWeight:600, color:'#f7f3ee', letterSpacing:'-0.01em' },
  tagline:   { fontFamily:'var(--font-display)', fontSize:24, fontStyle:'italic', color:'rgba(247,243,238,0.8)', lineHeight:1.5, marginBottom:32, whiteSpace:'pre-line' },
  features:  { display:'flex', flexDirection:'column', gap:10 },
  feat:      { display:'flex', alignItems:'center', gap:12, color:'rgba(247,243,238,0.75)', fontSize:15 },
  featDot:   { width:7, height:7, borderRadius:'50%', background:'var(--terra-lite)', flexShrink:0 },
  credit:    { color:'rgba(247,243,238,0.35)', fontSize:12, letterSpacing:'0.04em', zIndex:2 },

  /* Right form */
  right: {
    flex: 1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    padding:'40px 32px', background:'var(--bg)', position:'relative',
  },
  topBar:  { position:'absolute', top:24, right:28, display:'flex', gap:8 },
  langRow: { display:'flex', gap:4 },
  langBtn: {
    padding:'5px 12px', borderRadius:100,
    border:'1.5px solid var(--border-mid)',
    background:'transparent', cursor:'pointer',
    fontSize:13, color:'var(--text-3)', transition:'all 0.2s',
    fontFamily:'var(--font-body)',
  },
  langActive: { background:'var(--olive)', color:'#f7f3ee', borderColor:'var(--olive)', fontWeight:600 },

  formWrap: { width:'100%', maxWidth:420 },
  modePill: {
    display:'flex', background:'var(--surface-2)', borderRadius:100, padding:5,
    marginBottom:32, border:'1.5px solid var(--border-mid)',
  },
  modeBtn: {
    flex:1, padding:'10px 16px', borderRadius:100, border:'none',
    background:'transparent', cursor:'pointer', fontSize:14, fontWeight:500,
    color:'var(--text-3)', transition:'all 0.22s', fontFamily:'var(--font-body)',
  },
  modeBtnOn: { background:'var(--surface)', color:'var(--text-1)', fontWeight:600, boxShadow:'0 2px 8px rgba(30,30,24,0.1)' },

  formTitle: { fontFamily:'var(--font-display)', fontSize:36, fontWeight:600, color:'var(--text-1)', marginBottom:6, lineHeight:1.2 },
  formSub:   { color:'var(--text-3)', fontSize:15, marginBottom:28 },

  inputWrap: { marginBottom:16 },
  label:     { display:'block', fontSize:13, fontWeight:500, color:'var(--text-2)', marginBottom:6, letterSpacing:'0.02em' },

  form: { display:'flex', flexDirection:'column', marginBottom:0 },
  err:  { background:'rgba(193,98,63,0.08)', border:'1.5px solid rgba(193,98,63,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, color:'var(--terra)', fontSize:14 },
  suc:  { background:'rgba(90,110,68,0.08)', border:'1.5px solid rgba(90,110,68,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, color:'var(--olive-mid)', fontSize:14 },

  orRow:  { display:'flex', alignItems:'center', gap:12, margin:'20px 0' },
  orLine: { flex:1, height:1, background:'var(--border-mid)' },
  orText: { color:'var(--text-3)', fontSize:13 },

  creditMobile: { position:'absolute', bottom:20, color:'var(--text-3)', fontSize:12, textAlign:'center' },
};