import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function SettingsPanel({ onClose }) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [section, setSection] = useState(null);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notifWater, setNotifWater] = useState(true);
  const [notifFertilize, setNotifFertilize] = useState(true);
  const [notifRepot, setNotifRepot] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function saveProfile() {
    setProfileLoading(true); setProfileMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
      if (error) throw error;
      setProfileMsg('✓ ' + t.profileUpdated);
    } catch(e) { setProfileMsg('✗ ' + e.message); }
    finally { setProfileLoading(false); }
  }

  async function changePassword() {
    setPasswordMsg('');
    if (newPassword !== confirmPassword) { setPasswordMsg(t.passwordMismatch); return; }
    if (newPassword.length < 6) { setPasswordMsg(t.passwordShort); return; }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('✓ ' + t.passwordChanged);
      setNewPassword(''); setConfirmPassword('');
    } catch(e) { setPasswordMsg('✗ ' + e.message); }
    finally { setPasswordLoading(false); }
  }

  function saveNotifications() { setNotifMsg('✓ ' + t.notifSaved); setTimeout(()=>setNotifMsg(''), 2000); }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      await supabase.from('user_plants').delete().eq('user_id', user.id);
      await supabase.from('plant_chats').delete().eq('user_id', user.id);
      await supabase.from('growth_logs').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await signOut();
    } catch(e) { setDeleteLoading(false); alert('Error: ' + e.message); }
  }

  const goBack = () => { setSection(null); setProfileMsg(''); setPasswordMsg(''); setNotifMsg(''); };

  const menuItems = [
    { key:'profile',       icon:'👤', label:t.profileInfo,         sub:user?.email },
    { key:'password',      icon:'🔒', label:t.changePassword,      sub:t.changePasswordSub },
    { key:'notifications', icon:'🔔', label:t.manageNotifications, sub:t.notificationsSub },
    { key:'delete',        icon:'🗑️', label:t.deleteAccountLabel,  sub:t.deleteAccountSub, danger:true },
  ];

  const initials = (user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase();

  return (
    <>
      <div style={s.backdrop} onClick={onClose}/>
      {/* Slide from LEFT */}
      <div style={s.panel} className="animate-slideLeft">

        {/* ── Header ── */}
        <div style={s.hdr}>
          {section ? (
            <button style={s.backBtn} onClick={goBack}>←</button>
          ) : (
            <div style={s.avatar}>{initials}</div>
          )}
          <div style={{flex:1}}>
            <h2 style={s.ttl}>{section ? menuItems.find(m=>m.key===section)?.label : t.settings}</h2>
            {!section && <p style={s.email}>{user?.email}</p>}
          </div>
          <button style={s.cls} onClick={onClose}>✕</button>
        </div>

        {/* ── Main menu ── */}
        {!section && (
          <div style={s.scroll}>
            {/* Theme toggle row */}
            <div style={s.themeRow}>
              <div style={s.themeLeft}>
                <span style={s.themeIcon}>{theme==='light'?'🌙':'☀️'}</span>
                <div>
                  <p style={s.tlbl}>{theme==='light'?'Dark Mode':'Light Mode'}</p>
                  <p style={s.tsub}>{theme==='light'?'Switch to dark theme':'Switch to light theme'}</p>
                </div>
              </div>
              <div style={{...s.sw,...(theme==='dark'?s.swOn:{})}} onClick={toggleTheme}>
                <div style={{...s.swThumb,...(theme==='dark'?s.swThumbOn:{})}}/>
              </div>
            </div>

            <div style={s.sectionLabel}>Account</div>
            {menuItems.map(item => (
              <button key={item.key} style={s.mi} onClick={()=>setSection(item.key)}>
                <span style={{...s.micon,...(item.danger?{background:'rgba(193,98,63,0.1)'}:{})}}>{item.icon}</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <p style={{...s.mlbl,...(item.danger?{color:'var(--terra)'}:{})}}>{item.label}</p>
                  <p style={s.msub}>{item.sub}</p>
                </div>
                <span style={s.marr}>›</span>
              </button>
            ))}

            <div style={s.divider}/>
            <button style={s.signoutBtn} onClick={signOut}>{t.signOut}</button>
          </div>
        )}

        {/* ── Profile section ── */}
        {section==='profile' && (
          <div style={s.body}>
            <div style={s.field}>
              <label style={s.lbl}>{t.displayName}</label>
              <input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder={t.yourName}/>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>{t.emailAddress}</label>
              <input className="input" value={user?.email||''} disabled style={{opacity:0.55,cursor:'not-allowed'}}/>
              <p style={s.hint}>{t.emailCannotChange}</p>
            </div>
            {profileMsg && <Msg text={profileMsg}/>}
            <button className="btn btn-primary" onClick={saveProfile} disabled={profileLoading} style={{width:'100%',borderRadius:12}}>
              {profileLoading ? <span className="spinner"/> : t.saveChanges}
            </button>
          </div>
        )}

        {/* ── Password section ── */}
        {section==='password' && (
          <div style={s.body}>
            <div style={s.field}>
              <label style={s.lbl}>{t.newPassword}</label>
              <input className="input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder={t.minChars}/>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>{t.confirmNewPassword}</label>
              <input className="input" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={t.repeatPassword}/>
            </div>
            {passwordMsg && <Msg text={passwordMsg}/>}
            <button className="btn btn-primary" onClick={changePassword} disabled={passwordLoading} style={{width:'100%',borderRadius:12}}>
              {passwordLoading ? <span className="spinner"/> : t.updatePassword}
            </button>
          </div>
        )}

        {/* ── Notifications section ── */}
        {section==='notifications' && (
          <div style={s.body}>
            <p style={s.hint}>{t.chooseReminders}</p>
            {[
              {label:t.wateringReminders,    sub:t.wateringRemindersSub,    val:notifWater,     set:setNotifWater},
              {label:t.fertilizingReminders, sub:t.fertilizingRemindersSub, val:notifFertilize, set:setNotifFertilize},
              {label:t.repottingReminders,   sub:t.repottingRemindersSub,   val:notifRepot,     set:setNotifRepot},
            ].map(item => (
              <div key={item.label} style={s.toggleRow}>
                <div style={{flex:1}}>
                  <p style={s.tlbl}>{item.label}</p>
                  <p style={s.tsub}>{item.sub}</p>
                </div>
                <div style={{...s.sw,...(item.val?s.swOn:{})}} onClick={()=>item.set(!item.val)}>
                  <div style={{...s.swThumb,...(item.val?s.swThumbOn:{})}}/>
                </div>
              </div>
            ))}
            {notifMsg && <Msg text={notifMsg}/>}
            <button className="btn btn-primary" onClick={saveNotifications} style={{width:'100%',borderRadius:12}}>{t.savePreferences}</button>
          </div>
        )}

        {/* ── Delete account section ── */}
        {section==='delete' && (
          <div style={s.body}>
            <div style={s.warnBox}>
              <p style={{fontSize:36,marginBottom:10}}>⚠️</p>
              <p style={{fontWeight:600,color:'var(--terra)',marginBottom:6,fontSize:16}}>{t.cannotBeUndone}</p>
              <p style={{fontSize:14,color:'var(--text-2)',lineHeight:1.6}}>{t.deleteWarning}</p>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>{t.typeDeleteToConfirm}</label>
              <input className="input" value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} placeholder="DELETE"
                style={{borderColor:deleteConfirm==='DELETE'?'var(--terra)':undefined}}/>
            </div>
            <button style={{...s.delBtn,opacity:deleteConfirm==='DELETE'?1:0.45}} onClick={deleteAccount} disabled={deleteConfirm!=='DELETE'||deleteLoading}>
              {deleteLoading?<span className="spinner"/>:t.deleteAccountBtn}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Msg({ text }) {
  const ok = text.startsWith('✓');
  return <div style={{padding:'10px 14px',borderRadius:10,fontSize:14,background:ok?'rgba(90,110,68,0.09)':'rgba(193,98,63,0.09)',color:ok?'var(--olive-mid)':'var(--terra)',border:`1px solid ${ok?'rgba(90,110,68,0.2)':'rgba(193,98,63,0.2)'}`}}>{text}</div>;
}

const s = {
  backdrop: {position:'fixed',inset:0,background:'var(--modal-bd)',backdropFilter:'blur(5px)',zIndex:200},
  /* Slide FROM LEFT — fixed left side panel */
  panel:    {position:'fixed',top:0,left:0,bottom:0,width:'min(380px,92vw)',background:'var(--surface)',zIndex:201,display:'flex',flexDirection:'column',boxShadow:'8px 0 48px rgba(0,0,0,0.2)',overflowY:'auto'},
  hdr:      {display:'flex',alignItems:'center',gap:14,padding:'20px 20px 16px',borderBottom:'1px solid var(--border)',flexShrink:0},
  avatar:   {width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,var(--olive),var(--olive-mid))',color:'var(--text-inv)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,flexShrink:0},
  backBtn:  {width:36,height:36,borderRadius:10,background:'var(--surface-2)',border:'1px solid var(--border-mid)',cursor:'pointer',fontSize:18,color:'var(--text-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  ttl:      {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:600,color:'var(--text-1)'},
  email:    {fontSize:12,color:'var(--text-3)',marginTop:2},
  cls:      {background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-3)',padding:4,flexShrink:0},
  scroll:   {flex:1,overflowY:'auto',paddingBottom:32},
  sectionLabel:{fontSize:11,fontWeight:600,color:'var(--text-3)',letterSpacing:'0.08em',textTransform:'uppercase',padding:'20px 20px 8px'},
  themeRow: {display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:'1px solid var(--border)'},
  themeLeft:{display:'flex',alignItems:'center',gap:12,flex:1},
  themeIcon:{fontSize:20,width:36,height:36,borderRadius:10,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  mi:       {display:'flex',alignItems:'center',gap:14,width:'100%',padding:'14px 20px',background:'none',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.15s'},
  micon:    {fontSize:18,width:36,height:36,borderRadius:10,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  mlbl:     {fontSize:15,fontWeight:500,color:'var(--text-1)',marginBottom:2},
  msub:     {fontSize:12,color:'var(--text-3)'},
  marr:     {fontSize:20,color:'var(--text-3)'},
  divider:  {height:1,background:'var(--border)',margin:'12px 20px'},
  signoutBtn:{display:'block',width:'calc(100% - 40px)',margin:'0 20px',padding:'13px',background:'var(--surface-2)',border:'1.5px solid var(--border-mid)',borderRadius:12,cursor:'pointer',fontSize:15,fontWeight:500,color:'var(--text-1)',textAlign:'center'},
  body:     {padding:'20px 20px 40px',display:'flex',flexDirection:'column',gap:16},
  field:    {display:'flex',flexDirection:'column',gap:6},
  lbl:      {fontSize:12,fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:0.5},
  hint:     {fontSize:12,color:'var(--text-3)',lineHeight:1.5},
  toggleRow:{display:'flex',alignItems:'center',gap:14,padding:'14px 0',borderBottom:'1px solid var(--border)'},
  tlbl:     {fontSize:15,fontWeight:500,color:'var(--text-1)',marginBottom:2},
  tsub:     {fontSize:12,color:'var(--text-3)'},
  sw:       {width:46,height:26,borderRadius:13,background:'var(--border-mid)',position:'relative',cursor:'pointer',transition:'background 0.22s',flexShrink:0},
  swOn:     {background:'var(--olive-mid)'},
  swThumb:  {position:'absolute',top:3,left:3,width:20,height:20,borderRadius:'50%',background:'white',boxShadow:'0 1px 4px rgba(0,0,0,0.18)',transition:'left 0.22s'},
  swThumbOn:{left:23},
  warnBox:  {background:'rgba(193,98,63,0.06)',border:'1px solid rgba(193,98,63,0.15)',borderRadius:14,padding:'20px',textAlign:'center'},
  delBtn:   {width:'100%',padding:'14px',background:'var(--terra)',color:'white',border:'none',borderRadius:12,cursor:'pointer',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'opacity 0.2s'},
};