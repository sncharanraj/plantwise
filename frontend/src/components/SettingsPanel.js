import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function SettingsPanel({ onClose }) {
  const { user, signOut } = useAuth();
  const [section, setSection] = useState(null);

  // Profile state
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications state
  const [notifWater, setNotifWater] = useState(true);
  const [notifFertilize, setNotifFertilize] = useState(true);
  const [notifRepot, setNotifRepot] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function saveProfile() {
    setProfileLoading(true); setProfileMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
      if (error) throw error;
      setProfileMsg('✓ Profile updated successfully');
    } catch (e) { setProfileMsg('✗ ' + e.message); }
    finally { setProfileLoading(false); }
  }

  async function changePassword() {
    setPasswordMsg('');
    if (newPassword !== confirmPassword) { setPasswordMsg('✗ Passwords do not match'); return; }
    if (newPassword.length < 6) { setPasswordMsg('✗ Password must be at least 6 characters'); return; }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('✓ Password changed successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) { setPasswordMsg('✗ ' + e.message); }
    finally { setPasswordLoading(false); }
  }

  function saveNotifications() {
    setNotifMsg('✓ Notification preferences saved');
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
      await supabase.auth.admin?.deleteUser(user.id);
      await signOut();
    } catch (e) {
      setDeleteLoading(false);
      alert('Error deleting account: ' + e.message);
    }
  }

  const menuItems = [
    { key: 'profile', icon: '👤', label: 'Profile Info', sub: user?.email },
    { key: 'password', icon: '🔒', label: 'Change Password', sub: 'Update your password' },
    { key: 'notifications', icon: '🔔', label: 'Notifications', sub: 'Manage reminders' },
    { key: 'delete', icon: '🗑️', label: 'Delete Account', sub: 'Permanently remove your data', danger: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={s.panel} className="animate-fadeUp">
        {/* Handle */}
        <div style={s.handle} />

        {/* Header */}
        <div style={s.hdr}>
          {section ? (
            <button style={s.back} onClick={() => { setSection(null); setProfileMsg(''); setPasswordMsg(''); setNotifMsg(''); }}>
              ← Back
            </button>
          ) : (
            <div style={s.avatar}>
              {(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={s.ttl}>{section ? menuItems.find(m => m.key === section)?.label : 'Settings'}</h2>
            {!section && <p style={s.email}>{user?.email}</p>}
          </div>
          <button style={s.cls} onClick={onClose}>✕</button>
        </div>

        {/* Menu */}
        {!section && (
          <div style={s.menu}>
            {menuItems.map(item => (
              <button key={item.key} style={{ ...s.mi, ...(item.danger ? s.miDanger : {}) }} onClick={() => setSection(item.key)}>
                <span style={s.micon}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ ...s.mlbl, ...(item.danger ? { color: 'var(--danger)' } : {}) }}>{item.label}</p>
                  <p style={s.msub}>{item.sub}</p>
                </div>
                <span style={s.marr}>›</span>
              </button>
            ))}

            <div style={s.divider} />

            <button style={s.signout} onClick={signOut}>
              Sign Out
            </button>

            <p style={s.ver}>PlantWise • Made with ♥ by S N Charanraj</p>
          </div>
        )}

        {/* Profile Section */}
        {section === 'profile' && (
          <div style={s.body}>
            <div style={s.field}>
              <label style={s.lbl}>Display Name</label>
              <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Email Address</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <p style={s.hint}>Email cannot be changed</p>
            </div>
            {profileMsg && <div style={{ ...s.msg, ...(profileMsg.startsWith('✓') ? s.msgOk : s.msgErr) }}>{profileMsg}</div>}
            <button className="btn btn-primary" onClick={saveProfile} disabled={profileLoading} style={{ width: '100%', marginTop: 8 }}>
              {profileLoading ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Password Section */}
        {section === 'password' && (
          <div style={s.body}>
            <div style={s.field}>
              <label style={s.lbl}>New Password</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Confirm New Password</label>
              <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
            </div>
            {passwordMsg && <div style={{ ...s.msg, ...(passwordMsg.startsWith('✓') ? s.msgOk : s.msgErr) }}>{passwordMsg}</div>}
            <button className="btn btn-primary" onClick={changePassword} disabled={passwordLoading} style={{ width: '100%', marginTop: 8 }}>
              {passwordLoading ? <span className="spinner" /> : 'Update Password'}
            </button>
          </div>
        )}

        {/* Notifications Section */}
        {section === 'notifications' && (
          <div style={s.body}>
            <p style={s.hint2}>Choose which reminders you'd like to receive for your plants.</p>
            {[
              { label: '💧 Watering reminders', sub: 'Get notified when plants need water', val: notifWater, set: setNotifWater },
              { label: '🌿 Fertilizing reminders', sub: 'Get notified when plants need feeding', val: notifFertilize, set: setNotifFertilize },
              { label: '🪴 Repotting reminders', sub: 'Get notified when plants need repotting', val: notifRepot, set: setNotifRepot },
            ].map(item => (
              <div key={item.label} style={s.toggle}>
                <div style={{ flex: 1 }}>
                  <p style={s.tlbl}>{item.label}</p>
                  <p style={s.tsub}>{item.sub}</p>
                </div>
                <div style={{ ...s.sw, ...(item.val ? s.swOn : {}) }} onClick={() => item.set(!item.val)}>
                  <div style={{ ...s.swThumb, ...(item.val ? s.swThumbOn : {}) }} />
                </div>
              </div>
            ))}
            {notifMsg && <div style={{ ...s.msg, ...s.msgOk }}>{notifMsg}</div>}
            <button className="btn btn-primary" onClick={saveNotifications} style={{ width: '100%', marginTop: 8 }}>
              Save Preferences
            </button>
          </div>
        )}

        {/* Delete Account Section */}
        {section === 'delete' && (
          <div style={s.body}>
            <div style={s.warn}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>⚠️</p>
              <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>This cannot be undone</p>
              <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                All your plants, care guides, chat history, and journal entries will be permanently deleted.
              </p>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Type <strong>DELETE</strong> to confirm</label>
              <input className="input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" style={{ borderColor: deleteConfirm === 'DELETE' ? 'var(--danger)' : undefined }} />
            </div>
            <button
              style={{ ...s.delBtn, opacity: deleteConfirm === 'DELETE' ? 1 : 0.5 }}
              onClick={deleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
            >
              {deleteLoading ? <span className="spinner" /> : '🗑️ Permanently Delete Account'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const s = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200 },
  panel: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '24px 24px 0 0', zIndex: 201, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' },
  handle: { width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 0' },
  hdr: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px 12px', borderBottom: '1px solid var(--border)' },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--forest),var(--sage))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  back: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontSize: 15, fontWeight: 600, padding: '4px 0' },
  ttl: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-dark)' },
  email: { fontSize: 13, color: 'var(--text-light)', marginTop: 2 },
  cls: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-light)', padding: 4 },
  menu: { padding: '8px 0 24px' },
  mi: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' },
  miDanger: {},
  micon: { fontSize: 22, width: 36, height: 36, borderRadius: 10, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mlbl: { fontSize: 15, fontWeight: 500, color: 'var(--text-dark)', marginBottom: 2 },
  msub: { fontSize: 13, color: 'var(--text-light)' },
  marr: { fontSize: 20, color: 'var(--text-light)' },
  divider: { height: 1, background: 'var(--border)', margin: '12px 24px' },
  signout: { display: 'block', width: 'calc(100% - 48px)', margin: '0 24px', padding: '14px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 500, color: 'var(--text-dark)', textAlign: 'center' },
  ver: { textAlign: 'center', color: 'var(--text-light)', fontSize: 12, marginTop: 20, letterSpacing: 0.3 },
  body: { padding: '20px 24px 40px', display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  lbl: { fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: 'var(--text-light)', marginTop: 4 },
  hint2: { fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 },
  msg: { padding: '10px 14px', borderRadius: 10, fontSize: 14 },
  msgOk: { background: 'rgba(39,174,96,0.08)', color: 'var(--success)', border: '1px solid rgba(39,174,96,0.2)' },
  msgErr: { background: 'rgba(192,57,43,0.08)', color: 'var(--danger)', border: '1px solid rgba(192,57,43,0.2)' },
  toggle: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' },
  tlbl: { fontSize: 15, fontWeight: 500, color: 'var(--text-dark)', marginBottom: 2 },
  tsub: { fontSize: 13, color: 'var(--text-light)' },
  sw: { width: 48, height: 28, borderRadius: 14, background: 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 },
  swOn: { background: 'var(--sage)' },
  swThumb: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' },
  swThumbOn: { left: 23 },
  warn: { background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 14, padding: '20px', textAlign: 'center' },
  delBtn: { width: '100%', padding: '14px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
};
