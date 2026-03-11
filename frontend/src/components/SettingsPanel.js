import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function SettingsPanel({ onClose }) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
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
      setProfileMsg(t.profileUpdated);
    } catch (e) { setProfileMsg('✗ ' + e.message); }
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
      setPasswordMsg(t.passwordChanged);
      setNewPassword(''); setConfirmPassword('');
    } catch (e) { setPasswordMsg('✗ ' + e.message); }
    finally { setPasswordLoading(false); }
  }

  function saveNotifications() {
    setNotifMsg(t.notifSaved);
    setTimeout(() => setNotifMsg(''), 2000);
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      await supabase.from('user_plants').delete().eq('user_id', user.id);
      await supabase.from('plant_chats').delete().eq('user_id', user.id);
      await supabase.from('growth_logs').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await signOut();
    } catch (e) { setDeleteLoading(false); alert('Error: ' + e.message); }
  }

  const menuItems = [
    { key:'profile',       icon:'👤', label:t.profileInfo,        sub:user?.email },
    { key:'password',      icon:'🔒', label:t.changePassword,     sub:t.changePasswordSub },
    { key:'notifications', icon:'🔔', label:t.manageNotifications,sub:t.notificationsSub },
    { key:'delete',        icon:'🗑️', label:t.deleteAccountLabel, sub:t.deleteAccountSub, danger:true },
  ];

  const currentSection = menuItems.find(m => m.key === section);

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.panel} className="animate-fadeUp">
        <div style={s.handle} />
        <div style={s.hdr}>
          {section ? (
            <button style={s.back} onClick={() => { setSection(null); setProfileMsg(''); setPasswordMsg(''); setNotifMsg(''); }}>
              ← {t.back}
            </button>
          ) : (
            <div style={s.avatar}>{(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}</div>
          )}
          <div style={{ flex:1 }}>
            <h2 style={s.ttl}>{section ? currentSection?.label : t.settings}</h2>
            {!section && <p style={s.email}>{user?.email}</p>}
          </div>
          <button style={s.cls} onClick={onClose}>✕</button>
        </div>

        {!section && (
          <div style={s.menu}>
            {menuItems.map(item => (
              <button key={item.key} style={s.mi} onClick={() => setSection(item.key)}>
                <span style={s.micon}>{item.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ ...s.mlbl, ...(item.danger?{color:'var(--danger)'}:{}) }}>{item.label}</p>
                  <p style={s.msub}>{item.sub}</p>
                </div>
                <span style={s.marr}>›</span>
              </button>
            ))}
            <div style={s.divider} />
            <button style={s.signout} onClick={signOut}>{t.signOut}</button>
            <p style={s.ver}>PlantWise • Made with ♥ by S N Charanraj</p>
          </div>
        )}

        {section === 'profile' && (
          <div style={s.body}>
            <div style={s.field}>
              <label style={s.lbl}>{t.displayName}</label>
              <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t.yourName} />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>{t.emailAddress}</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity:0.6,cursor:'not-allowed' }} />
              <p style={s.hint}>{t.emailCannotChange}</p>
            </div>
            {profileMsg && <div style={{ ...s.msg, ...(profileMsg.startsWith('✓')?s.msgOk:s.msgErr) }}>{profileMsg}</div>}
            <button className="btn btn-primary" onClick={saveProfile} disabled={profileLoading} style={{ width:'100%',marginTop:8 }}>
              {profileLoading ? <span className="spinner" /> : t.saveChanges}
            </button>
          </div>
        )}

        {section === 'password' && (
          <div style={s.body}>
            <div style={s.field}>
              <label style={s.lbl}>{t.newPassword}</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t.minChars} />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>{t.confirmNewPassword}</label>
              <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t.repeatPassword} />
            </div>
            {passwordMsg && <div style={{ ...s.msg, ...(passwordMsg.startsWith('✓')?s.msgOk:s.msgErr) }}>{passwordMsg}</div>}
            <button className="btn btn-primary" onClick={changePassword} disabled={passwordLoading} style={{ width:'100%',marginTop:8 }}>
              {passwordLoading ? <span className="spinner" /> : t.updatePassword}
            </button>
          </div>
        )}

        {section === 'notifications' && (
          <div style={s.body}>
            <p style={s.hint2}>{t.chooseReminders}</p>
            {[
              { label:t.wateringReminders,     sub:t.wateringRemindersSub,     val:notifWater,     set:setNotifWater },
              { label:t.fertilizingReminders,  sub:t.fertilizingRemindersSub,  val:notifFertilize, set:setNotifFertilize },
              { label:t.repottingReminders,     sub:t.repottingRemindersSub,    val:notifRepot,     set:setNotifRepot },
            ].map(item => (
              <div key={item.label} style={s.toggle}>
                <div style={{ flex:1 }}>
                  <p style={s.tlbl}>{item.label}</p>
                  <p style={s.tsub}>{item.sub}</p>
                </div>
                <div style={{ ...s.sw, ...(item.val?s.swOn:{}) }} onClick={() => item.set(!item.val)}>
                  <div style={{ ...s.swThumb, ...(item.val?s.swThumbOn:{}) }} />
                </div>
              </div>
            ))}
            {notifMsg && <div style={{ ...s.msg, ...s.msgOk }}>{notifMsg}</div>}
            <button className="btn btn-primary" onClick={saveNotifications} style={{ width:'100%',marginTop:8 }}>
              {t.savePreferences}
            </button>
          </div>
        )}

        {section === 'delete' && (
          <div style={s.body}>
            <div style={s.warn}>
              <p style={{ fontSize:32,marginBottom:12 }}>⚠️</p>
              <p style={{ fontWeight:600,color:'var(--danger)',marginBottom:8 }}>{t.cannotBeUndone}</p>
              <p style={{ fontSize:14,color:'var(--text-2)',lineHeight:1.6 }}>{t.deleteWarning}</p>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>{t.typeDeleteToConfirm}</label>
              <input className="input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" style={{ borderColor:deleteConfirm==='DELETE'?'var(--danger)':undefined }} />
            </div>
            <button
              style={{ ...s.delBtn, opacity:deleteConfirm==='DELETE'?1:0.5 }}
              onClick={deleteAccount}
              disabled={deleteConfirm!=='DELETE'||deleteLoading}
            >
              {deleteLoading ? <span className="spinner" /> : t.deleteAccountBtn}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const s = {
  backdrop:{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)',zIndex:200},
  panel:{position:'fixed',bottom:0,left:0,right:0,background:'white',borderRadius:'24px 24px 0 0',zIndex:201,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 -8px 40px rgba(0,0,0,0.15)'},
  handle:{width:40,height:4,background:'var(--border)',borderRadius:2,margin:'12px auto 0'},
  hdr:{display:'flex',alignItems:'center',gap:14,padding:'16px 24px 12px',borderBottom:'1px solid var(--border)'},
  avatar:{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,var(--olive),var(--olive-mid))',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,flexShrink:0},
  back:{background:'none',border:'none',cursor:'pointer',color:'var(--olive-mid)',fontSize:15,fontWeight:600,padding:'4px 0'},
  ttl:{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,color:'var(--text-1)'},
  email:{fontSize:13,color:'var(--text-3)',marginTop:2},
  cls:{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-3)',padding:4},
  menu:{padding:'8px 0 24px'},
  mi:{display:'flex',alignItems:'center',gap:14,width:'100%',padding:'14px 24px',background:'none',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.15s'},
  micon:{fontSize:22,width:36,height:36,borderRadius:10,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  mlbl:{fontSize:15,fontWeight:500,color:'var(--text-1)',marginBottom:2},
  msub:{fontSize:13,color:'var(--text-3)'},
  marr:{fontSize:20,color:'var(--text-3)'},
  divider:{height:1,background:'var(--border)',margin:'12px 24px'},
  signout:{display:'block',width:'calc(100% - 48px)',margin:'0 24px',padding:'14px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,cursor:'pointer',fontSize:15,fontWeight:500,color:'var(--text-1)',textAlign:'center'},
  ver:{textAlign:'center',color:'var(--text-3)',fontSize:12,marginTop:20,letterSpacing:0.3},
  body:{padding:'20px 24px 40px',display:'flex',flexDirection:'column',gap:16},
  field:{display:'flex',flexDirection:'column',gap:6},
  lbl:{fontSize:13,fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:0.5},
  hint:{fontSize:12,color:'var(--text-3)',marginTop:4},
  hint2:{fontSize:14,color:'var(--text-2)',lineHeight:1.6},
  msg:{padding:'10px 14px',borderRadius:10,fontSize:14},
  msgOk:{background:'rgba(39,174,96,0.08)',color:'var(--olive-mid)',border:'1px solid rgba(39,174,96,0.2)'},
  msgErr:{background:'rgba(192,57,43,0.08)',color:'var(--danger)',border:'1px solid rgba(192,57,43,0.2)'},
  toggle:{display:'flex',alignItems:'center',gap:14,padding:'14px 0',borderBottom:'1px solid var(--border)'},
  tlbl:{fontSize:15,fontWeight:500,color:'var(--text-1)',marginBottom:2},
  tsub:{fontSize:13,color:'var(--text-3)'},
  sw:{width:48,height:28,borderRadius:14,background:'var(--border)',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0},
  swOn:{background:'var(--olive-mid)'},
  swThumb:{position:'absolute',top:3,left:3,width:22,height:22,borderRadius:'50%',background:'white',boxShadow:'0 1px 4px rgba(0,0,0,0.2)',transition:'left 0.2s'},
  swThumbOn:{left:23},
  warn:{background:'rgba(192,57,43,0.05)',border:'1px solid rgba(192,57,43,0.15)',borderRadius:14,padding:'20px',textAlign:'center'},
  delBtn:{width:'100%',padding:'14px',background:'var(--danger)',color:'white',border:'none',borderRadius:12,cursor:'pointer',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8},
};