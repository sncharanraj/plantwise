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
      {/* ── Left botanical panel ── */}
      <div style={s.left} className="hide-mobile">
        <div style={s.leftInner}>
          <div style={s.circle1}/><div style={s.circle2}/><div style={s.circle3}/>
          <div style={s.botanical}>
            <BotanicalSVG/>
          </div>
          <div style={s.brandWrap}>
            <div style={s.logoRow}>
              <SunflowerSVG size={44}/>
              <span style={s.logoText}>PlantWise</span>
            </div>
            <p style={s.tagline}>{t.tagline}</p>
            <div style={s.features}>
              {[t.featureIdentify, t.featureGuides, t.featureChat, t.featureJournal].map((f,i) => (
                <div key={i} style={s.feat}><div style={s.featDot}/><span>{f}</span></div>
              ))}
            </div>
          </div>
          {/* Single credit — only on left panel */}
          <p style={s.credit}>Made with ♥ by S N Charanraj</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.right}>
        <div style={s.topBar}>
          <div style={s.langRow}>
            {LANGS.map(l => (
              <button key={l.code} style={{...s.langBtn,...(lang===l.code?s.langActive:{})}} onClick={() => switchLang(l.code)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile logo */}
        <div style={s.mobileLogo} className="hide-desktop">
          <SunflowerSVG size={32}/>
          <span style={s.mobileLogoText}>PlantWise</span>
        </div>

        <div style={s.formWrap} className="animate-fadeUp">
          <div style={s.modePill}>
            <button style={{...s.modeBtn,...(mode==='login'?s.modeBtnOn:{})}} onClick={() => { setMode('login'); setError(''); }}>
              {t.signIn}
            </button>
            <button style={{...s.modeBtn,...(mode==='signup'?s.modeBtnOn:{})}} onClick={() => { setMode('signup'); setError(''); }}>
              {t.createAccount}
            </button>
          </div>

          <h1 style={s.formTitle}>{mode==='login' ? t.welcomeBack : t.startGrowing}</h1>
          <p style={s.formSub}>{mode==='login' ? t.signInToGarden : t.createFreeAccount}</p>

          {error   && <div style={s.err}>{error}</div>}
          {success && <div style={s.suc}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <div style={s.inputWrap}>
              <label style={s.label}>{t.emailAddress}</label>
              <input className="input" type="email" placeholder={t.emailPlaceholder} value={email} onChange={e=>setEmail(e.target.value)} required/>
            </div>
            <div style={s.inputWrap}>
              <label style={s.label}>{t.passwordPlaceholder}</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',marginTop:8,borderRadius:14,padding:'15px 24px',fontSize:16}}>
              {loading ? <span className="spinner" style={{borderTopColor:'rgba(247,243,238,0.9)',borderColor:'rgba(247,243,238,0.2)'}}/> : mode==='login' ? t.signIn : t.createAccount}
            </button>
          </form>

          <div style={s.orRow}><span style={s.orLine}/><span style={s.orText}>or</span><span style={s.orLine}/></div>

          <button className="btn btn-secondary" onClick={signInWithGoogle} style={{width:'100%',borderRadius:14,padding:'14px 24px',gap:10}}>
            <GoogleIcon/>{t.continueWithGoogle}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>;
}

function SunflowerSVG({ size = 40 }) {
  // Monstera leaf logo
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 8 C20 8 10 22 12 42 C14 58 26 70 40 72 C54 70 66 58 68 42 C70 22 60 8 40 8Z"
        fill="rgba(255,255,255,0.85)"/>
      <ellipse cx="30" cy="38" rx="6" ry="9" fill="rgba(45,106,79,0.8)" transform="rotate(-15 30 38)"/>
      <ellipse cx="50" cy="38" rx="6" ry="9" fill="rgba(45,106,79,0.8)" transform="rotate(15 50 38)"/>
      <ellipse cx="40" cy="55" rx="5" ry="7" fill="rgba(45,106,79,0.8)"/>
      <path d="M40 12 L40 68" stroke="rgba(45,106,79,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M40 28 L20 20M40 28 L60 20M40 44 L16 38M40 44 L64 38"
        stroke="rgba(45,106,79,0.35)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M40 72 L40 78" stroke="rgba(45,106,79,0.7)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function BotanicalSVG() {
  return (
    <svg viewBox="0 0 280 360" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',maxWidth:260}}>
      <path d="M140 340 C140 340 30 250 50 140 C70 30 140 15 140 15 C140 15 210 30 230 140 C250 250 140 340 140 340Z" fill="rgba(255,255,255,0.12)"/>
      <path d="M140 15 L140 340" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
      <path d="M140 100 L85 160" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
      <path d="M140 140 L78 210" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
      <path d="M140 180 L82 255" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <path d="M140 100 L195 160" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
      <path d="M140 140 L202 210" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
      <path d="M140 180 L198 255" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <path d="M65 270 C65 270 30 238 38 208 C46 178 65 170 65 170 C65 170 84 178 92 208 C100 238 65 270 65 270Z" fill="rgba(193,98,63,0.45)"/>
      <path d="M218 225 C218 225 196 205 200 185 C204 165 218 160 218 160 C218 160 232 165 236 185 C240 205 218 225 218 225Z" fill="rgba(201,149,42,0.4)"/>
      <circle cx="55" cy="90" r="5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="238" cy="115" r="3.5" fill="rgba(193,98,63,0.5)"/>
      <circle cx="42" cy="295" r="4" fill="rgba(201,149,42,0.45)"/>
      <circle cx="258" cy="270" r="6" fill="rgba(255,255,255,0.18)"/>
    </svg>
  );
}

const s = {
  page:      {display:'flex',minHeight:'100vh',background:'var(--bg)'},
  left:      {width:'44%',minHeight:'100vh',background:'var(--grad-hero)',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'},
  leftInner: {position:'relative',flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'48px 44px',zIndex:2},
  circle1:   {position:'absolute',top:-80,right:-80,width:280,height:280,borderRadius:'50%',background:'rgba(255,255,255,0.04)',zIndex:1},
  circle2:   {position:'absolute',bottom:30,left:-60,width:200,height:200,borderRadius:'50%',background:'rgba(193,98,63,0.14)',zIndex:1},
  circle3:   {position:'absolute',top:'42%',right:-25,width:130,height:130,borderRadius:'50%',background:'rgba(201,149,42,0.1)',zIndex:1},
  botanical: {position:'absolute',right:-10,top:'50%',transform:'translateY(-50%)',width:'50%',zIndex:1,opacity:0.85},
  brandWrap: {zIndex:2},
  logoRow:   {display:'flex',alignItems:'center',gap:12,marginBottom:18},
  logoText:  {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:36,fontWeight:600,color:'#f7f3ee',letterSpacing:'-0.01em'},
  tagline:   {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:22,fontStyle:'italic',color:'rgba(247,243,238,0.8)',lineHeight:1.55,marginBottom:28,whiteSpace:'pre-line'},
  features:  {display:'flex',flexDirection:'column',gap:10},
  feat:      {display:'flex',alignItems:'center',gap:12,color:'rgba(247,243,238,0.75)',fontSize:15},
  featDot:   {width:6,height:6,borderRadius:'50%',background:'var(--terra-lite)',flexShrink:0},
  credit:    {color:'rgba(247,243,238,0.32)',fontSize:12,letterSpacing:'0.04em',zIndex:2},

  right:     {flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 32px',background:'var(--bg)',position:'relative'},
  topBar:    {position:'absolute',top:24,right:28,display:'flex',gap:8},
  langRow:   {display:'flex',gap:4},
  langBtn:   {padding:'5px 12px',borderRadius:100,border:'1.5px solid var(--border-mid)',background:'transparent',cursor:'pointer',fontSize:13,color:'var(--text-3)',transition:'all 0.2s',fontFamily:"'Plus Jakarta Sans',sans-serif"},
  langActive:{background:'var(--green)',color:'var(--text-inv)',borderColor:'var(--green)',fontWeight:600},
  mobileLogo:{display:'flex',alignItems:'center',gap:10,marginBottom:28},
  mobileLogoText:{fontFamily:"'DM Serif Display',Georgia,serif",fontSize:28,fontWeight:600,color:'var(--text-1)'},
  formWrap:  {width:'100%',maxWidth:420},
  modePill:  {display:'flex',background:'var(--surface-2)',borderRadius:100,padding:4,marginBottom:28,border:'1.5px solid var(--border-mid)'},
  modeBtn:   {flex:1,padding:'10px 16px',borderRadius:100,border:'none',background:'transparent',cursor:'pointer',fontSize:14,fontWeight:500,color:'var(--text-3)',transition:'all 0.22s',fontFamily:"'Plus Jakarta Sans',sans-serif"},
  modeBtnOn: {background:'var(--surface)',color:'var(--text-1)',fontWeight:600,boxShadow:'0 2px 8px rgba(30,30,24,0.1)'},
  formTitle: {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:36,fontWeight:600,color:'var(--text-1)',marginBottom:6,lineHeight:1.2},
  formSub:   {color:'var(--text-3)',fontSize:15,marginBottom:26},
  inputWrap: {marginBottom:16},
  label:     {display:'block',fontSize:13,fontWeight:500,color:'var(--text-2)',marginBottom:6,letterSpacing:'0.02em'},
  err:       {background:'rgba(193,98,63,0.08)',border:'1.5px solid rgba(193,98,63,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:20,color:'var(--rose)',fontSize:14},
  suc:       {background:'rgba(90,110,68,0.08)',border:'1.5px solid rgba(90,110,68,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:20,color:'var(--green-mid)',fontSize:14},
  orRow:     {display:'flex',alignItems:'center',gap:12,margin:'20px 0'},
  orLine:    {flex:1,height:1,background:'var(--border-mid)'},
  orText:    {color:'var(--text-3)',fontSize:13},
};