import { useLanguage } from '../context/LanguageContext';
import { markNotificationRead } from '../lib/api';

export default function NotificationPanel({ notifications, userId, onClose, onMarkAllRead }) {
  const { t } = useLanguage();
  const icon = { watering:'💧', fertilizing:'🌿', repotting:'🪴' };

  return (
    <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={s.panel} className="animate-growIn">
        <div style={s.hdr}>
          <h2 style={s.ttl}>{t.reminders}</h2>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            {notifications.length>0&&<button className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>{t.markAllRead}</button>}
            <button style={s.cls} onClick={onClose}>✕</button>
          </div>
        </div>
        {notifications.length===0?(
          <div style={s.empty}><p style={{fontSize:36,marginBottom:12}}>✅</p><p style={{color:'var(--text-3)'}}>{t.allCaughtUp}</p></div>
        ):(
          <div style={s.list}>
            {notifications.map(n=>(
              <div key={n.id} style={s.item}>
                <span style={s.ico}>{icon[n.type]||'🔔'}</span>
                <div style={{flex:1}}>
                  <p style={s.msg}>{n.message}</p>
                  <p style={s.time}>{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
                <button style={s.rb} onClick={()=>markNotificationRead(n.id)}>✓</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',padding:'70px 20px 20px'},
  panel:{background:'white',borderRadius:20,width:'100%',maxWidth:380,maxHeight:'70vh',overflow:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.15)',border:'1px solid var(--border)'},
  hdr:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid var(--border)'},
  ttl:{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600},
  cls:{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-3)'},
  empty:{textAlign:'center',padding:'40px 24px'},
  list:{padding:'12px 0'},
  item:{display:'flex',gap:14,padding:'14px 24px',borderBottom:'1px solid rgba(0,0,0,0.04)',alignItems:'flex-start'},
  ico:{fontSize:24,flexShrink:0},
  msg:{fontSize:14,color:'var(--text-1)',lineHeight:1.5,marginBottom:4},
  time:{fontSize:12,color:'var(--text-3)'},
  rb:{background:'var(--surface-2)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',color:'var(--olive-mid)',fontWeight:700,flexShrink:0},
};