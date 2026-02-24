import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserPlants, getNotifications, markAllNotificationsRead } from '../lib/api';
import AddPlantModal from '../components/AddPlantModal';
import NotificationPanel from '../components/NotificationPanel';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (user) { fetchPlants(); fetchNotifs(); } }, [user]);

  async function fetchPlants() {
    try { const r = await getUserPlants(user.id); setPlants(r.data||[]); }
    catch(e){} finally { setLoading(false); }
  }
  async function fetchNotifs() {
    try { const r = await getNotifications(user.id); setNotifications((r.data||[]).filter(n=>!n.read)); }
    catch(e){}
  }
  function onPlantAdded(p) { setPlants(prev=>[p,...prev]); setShowAdd(false); navigate(`/plant/${p.id}`); }

  const filtered = plants.filter(p=>p.plant_name.toLowerCase().includes(search.toLowerCase())||(p.scientific_name||'').toLowerCase().includes(search.toLowerCase()));
  const dc = {Beginner:'badge-green',Intermediate:'badge-amber',Expert:'badge-red'};

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.nl}><span style={s.nlo}>🌿</span><span style={s.nb}>PlantWise</span></div>
        <div style={s.nr}>
          <button style={s.nb2} onClick={()=>setShowNotifs(true)}>
            🔔{notifications.length>0&&<span style={s.nbdg}>{notifications.length}</span>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </nav>
      <div style={s.content}>
        <div style={s.hdr} className="animate-fadeUp">
          <div>
            <h1 style={s.ttl}><span style={{fontFamily:'var(--font-display)',fontStyle:'italic'}}>My</span> Garden</h1>
            <p style={s.sub}>{plants.length===0?'Start by adding your first plant':`You're growing ${plants.length} plant${plants.length!==1?'s':''}`}</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Plant</button>
        </div>
        {plants.length>0&&(
          <div style={s.sw} className="animate-fadeUp">
            <input className="input" placeholder="Search your plants..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:400}}/>
          </div>
        )}
        {loading?(
          <div style={s.ls}><div className="spinner spinner-dark" style={{width:32,height:32}}/><p style={{color:'var(--text-light)',marginTop:16}}>Loading your garden...</p></div>
        ):filtered.length===0&&plants.length===0?(
          <div style={s.es} className="animate-fadeUp">
            <div style={{fontSize:72,marginBottom:24}}>🌱</div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:28,marginBottom:12}}>Your garden is empty</h2>
            <p style={{color:'var(--text-light)',maxWidth:360,lineHeight:1.6,marginBottom:32}}>Identify a plant by name or photo and get a complete AI-powered care guide.</p>
            <button className="btn btn-primary btn-lg" onClick={()=>setShowAdd(true)}>+ Add your first plant</button>
          </div>
        ):(
          <div style={s.grid}>
            {filtered.map((p,i)=>(
              <div key={p.id} className="card animate-fadeUp" style={{...s.card,animationDelay:`${i*0.06}s`,cursor:'pointer'}} onClick={()=>navigate(`/plant/${p.id}`)}>
                <div style={s.ci}>
                  {p.image_url?<img src={p.image_url} alt={p.plant_name} style={s.img}/>:<div style={s.ph}><span style={{fontSize:48}}>🌿</span></div>}
                  <div style={s.ov}/>
                  {p.difficulty&&<span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={s.db}>{p.difficulty}</span>}
                </div>
                <div style={s.ci2}>
                  <h3 style={s.pn}>{p.plant_name}</h3>
                  {p.scientific_name&&<p style={s.sn}>{p.scientific_name}</p>}
                  <p style={s.dg}>🗓 {p.days_growing} days growing</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={s.bnav}>
        <button style={s.bb} onClick={()=>navigate('/')}><span>🏡</span><span style={s.bl}>Garden</span></button>
        <button style={{...s.bb,...s.ab}} onClick={()=>setShowAdd(true)}><span style={s.ai}>+</span></button>
        <button style={s.bb}><span>⚙️</span><span style={s.bl}>Settings</span></button>
      </div>
      {showAdd&&<AddPlantModal userId={user.id} onClose={()=>setShowAdd(false)} onPlantAdded={onPlantAdded}/>}
      {showNotifs&&<NotificationPanel notifications={notifications} userId={user.id} onClose={()=>setShowNotifs(false)} onMarkAllRead={()=>{markAllNotificationsRead(user.id);setNotifications([]);}}/>}
    </div>
  );
}

const s = {
  page:{minHeight:'100vh',background:'var(--warm-white)',paddingBottom:90},
  nav:{position:'sticky',top:0,zIndex:100,background:'rgba(250,248,244,0.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'0 24px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'},
  nl:{display:'flex',alignItems:'center',gap:10},
  nlo:{fontSize:24},
  nb:{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--forest)'},
  nr:{display:'flex',alignItems:'center',gap:12},
  nb2:{background:'none',border:'none',cursor:'pointer',fontSize:20,position:'relative',padding:4},
  nbdg:{position:'absolute',top:0,right:0,background:'#e74c3c',color:'white',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  content:{maxWidth:1200,margin:'0 auto',padding:'32px 24px'},
  hdr:{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:16},
  ttl:{fontSize:36,fontWeight:600,color:'var(--text-dark)',lineHeight:1.2},
  sub:{color:'var(--text-light)',fontSize:15,marginTop:4},
  sw:{marginBottom:24},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:20},
  card:{overflow:'hidden',transition:'all 0.25s ease'},
  ci:{position:'relative',height:180,overflow:'hidden',background:'linear-gradient(135deg,#e8f5e9,#c8e6c9)'},
  img:{width:'100%',height:'100%',objectFit:'cover'},
  ph:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,rgba(127,184,150,0.2),rgba(74,124,89,0.1))'},
  ov:{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.2),transparent)'},
  db:{position:'absolute',top:12,right:12},
  ci2:{padding:'16px 20px'},
  pn:{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,marginBottom:4},
  sn:{fontSize:13,fontStyle:'italic',color:'var(--text-light)',marginBottom:8},
  dg:{fontSize:13,color:'var(--text-mid)'},
  ls:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80},
  es:{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'80px 24px'},
  bnav:{position:'fixed',bottom:0,left:0,right:0,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderTop:'1px solid var(--border)',padding:'8px 24px 16px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  bb:{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:22,padding:'8px 20px',borderRadius:12},
  bl:{fontSize:11,color:'var(--text-light)'},
  ab:{background:'var(--forest)',borderRadius:'50%',width:52,height:52,padding:0},
  ai:{fontSize:28,color:'white',lineHeight:1}
};
