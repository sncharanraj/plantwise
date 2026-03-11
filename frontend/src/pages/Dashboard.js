import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserPlants, getNotifications, markAllNotificationsRead, deletePlant, addJournalEntry } from '../lib/api';
import AddPlantModal from '../components/AddPlantModal';
import NotificationPanel from '../components/NotificationPanel';
import SettingsPanel from '../components/SettingsPanel';

const LANG_NAMES = { en:'EN', hi:'हि', kn:'ಕ' };

export default function Dashboard() {
  const { user } = useAuth();
  const { lang, switchLang, t, tn, translateNames, translatingNames } = useLanguage();
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [wateringId, setWateringId] = useState(null);
  const [view, setView] = useState('home'); // 'home' | 'garden'
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('All');

  useEffect(() => { if (user) { fetchPlants(); fetchNotifs(); } }, [user]);
  useEffect(() => { if (plants.length > 0) translateNames(plants.map(p => p.plant_name)); }, [lang, plants.length]);

  async function fetchPlants() {
    try { const r = await getUserPlants(user.id); const data = r.data||[]; setPlants(data); if(data.length) translateNames(data.map(p=>p.plant_name)); }
    catch(e){} finally { setLoading(false); }
  }
  async function fetchNotifs() {
    try { const r = await getNotifications(user.id); setNotifications((r.data||[]).filter(n=>!n.read)); } catch(e){}
  }
  function onPlantAdded(p) { setPlants(prev=>[p,...prev]); setShowAdd(false); navigate(`/plant/${p.id}`); }

  async function handleDelete(plantId) {
    try { await deletePlant(plantId); setPlants(prev=>prev.filter(p=>p.id!==plantId)); setDeleteConfirm(null); }
    catch(e) { alert('Failed to delete'); }
  }
  async function handleWaterLog(e, plant) {
    e.stopPropagation(); setWateringId(plant.id);
    try { await addJournalEntry({plantId:plant.id,userId:user.id,note:`💧 Watered ${plant.plant_name}`,imageBase64:null,imageMimeType:null}); setTimeout(()=>setWateringId(null),1500); }
    catch(e){setWateringId(null);}
  }

  const DIFFS = ['All','Beginner','Intermediate','Expert'];
  const diffLabels = { All:t.all, Beginner:t.beginner, Intermediate:t.intermediate, Expert:t.expert };
  const filtered = plants.filter(p => {
    const name = tn(p.plant_name);
    const ms = name.toLowerCase().includes(search.toLowerCase()) || p.plant_name.toLowerCase().includes(search.toLowerCase());
    const md = filterDiff==='All' || p.difficulty===filterDiff;
    return ms && md;
  });
  const dc = { Beginner:'badge-green', Intermediate:'badge-amber', Expert:'badge-red' };

  const recentPlants = plants.slice(0,3);
  const totalDays = plants.reduce((acc,p)=>acc+(p.days_growing||0),0);

  return (
    <div style={pg.wrap}>
      {/* ── Top Nav ── */}
      <nav style={pg.nav}>
        <div style={pg.navL}>
          <span style={pg.navLeaf}>🌿</span>
          <span style={pg.navBrand}>PlantWise</span>
        </div>
        <div style={pg.navR}>
          {/* Lang switcher */}
          <div style={pg.langRow}>
            {Object.entries(LANG_NAMES).map(([code,label])=>(
              <button key={code} style={{...pg.langBtn,...(lang===code?pg.langOn:{})}} onClick={()=>switchLang(code)}>{label}</button>
            ))}
          </div>
          {/* Notif bell */}
          <button style={pg.navIcon} onClick={()=>setShowNotifs(true)}>
            🔔{notifications.length>0&&<span style={pg.badge}>{notifications.length}</span>}
          </button>
        </div>
      </nav>

      {view === 'home' ? (
        <HomeView
          user={user} plants={plants} recentPlants={recentPlants} totalDays={totalDays}
          loading={loading} t={t} tn={tn} translatingNames={translatingNames}
          onGarden={()=>setView('garden')} onAdd={()=>setShowAdd(true)}
          onSettings={()=>setShowSettings(true)} onPlantClick={id=>navigate(`/plant/${id}`)}
          dc={dc}
        />
      ) : (
        <GardenView
          plants={filtered} loading={loading} t={t} tn={tn}
          search={search} setSearch={setSearch}
          filterDiff={filterDiff} setFilterDiff={setFilterDiff}
          DIFFS={DIFFS} diffLabels={diffLabels} dc={dc}
          wateringId={wateringId}
          onBack={()=>setView('home')}
          onAdd={()=>setShowAdd(true)}
          onPlantClick={id=>navigate(`/plant/${id}`)}
          onWater={handleWaterLog}
          onDelete={id=>setDeleteConfirm(id)}
        />
      )}

      {/* ── Bottom Nav ── */}
      <div style={pg.bnav}>
        <NavBtn icon="🏡" label={t.garden||'Garden'} active={view==='home'} onClick={()=>setView('home')}/>
        <button style={pg.fab} onClick={()=>setShowAdd(true)}>
          <span style={pg.fabPlus}>+</span>
        </button>
        <NavBtn icon="⚙️" label={t.settings||'Settings'} onClick={()=>setShowSettings(true)}/>
      </div>

      {/* ── Delete Modal ── */}
      {deleteConfirm && (
        <>
          <div style={mo.bd} onClick={()=>setDeleteConfirm(null)}/>
          <div style={mo.box} className="animate-growIn">
            <div style={{fontSize:44,marginBottom:14}}>🌿</div>
            <h3 style={mo.title}>{t.deletePlant}</h3>
            <p style={mo.desc}>{t.deleteDesc}</p>
            <div style={{display:'flex',gap:12,marginTop:24}}>
              <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeleteConfirm(null)}>{t.cancel}</button>
              <button style={{...mo.delBtn,flex:1}} onClick={()=>handleDelete(deleteConfirm)}>{t.delete}</button>
            </div>
          </div>
        </>
      )}

      {showAdd      && <AddPlantModal userId={user.id} onClose={()=>setShowAdd(false)} onPlantAdded={onPlantAdded}/>}
      {showNotifs   && <NotificationPanel notifications={notifications} userId={user.id} onClose={()=>setShowNotifs(false)} onMarkAllRead={()=>{markAllNotificationsRead(user.id);setNotifications([]);}}/>}
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}

/* ── Home Page ── */
function HomeView({ user, plants, recentPlants, totalDays, loading, t, tn, translatingNames, onGarden, onAdd, onSettings, onPlantClick, dc }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Gardener';

  return (
    <div style={hv.page}>
      {/* Hero greeting */}
      <div style={hv.hero} className="animate-fadeUp">
        <div style={hv.heroDecor1}/><div style={hv.heroDecor2}/>
        <p style={hv.greet}>{greeting}</p>
        <h1 style={hv.name}>{firstName}</h1>
        <p style={hv.sub}>
          {plants.length === 0
            ? t.startByAdding
            : `${t.youreGrowing} ${plants.length} ${plants.length!==1?t.plants:t.plant}`}
        </p>
      </div>

      {/* Stats row */}
      {plants.length > 0 && (
        <div style={{...hv.stats, animationDelay:'0.1s'}} className="animate-fadeUp">
          <StatCard icon="🌱" value={plants.length} label={plants.length!==1?t.plants:t.plant}/>
          <StatCard icon="🗓" value={totalDays} label={t.daysGrowing||'days total'}/>
          <StatCard icon="⭐" value={plants.filter(p=>p.care_guide).length} label={t.careGuide||'guides'}/>
        </div>
      )}

      {/* 3 Big Action Buttons */}
      <div style={hv.actions} className="animate-fadeUp">
        <BigAction icon="🪴" label={t.myGarden||'My Garden'} sub={`${plants.length} ${plants.length!==1?t.plants:t.plant}`} color="#3d4a2e" onClick={onGarden}/>
        <BigAction icon="✦" label={t.addPlant||'Add Plant'} sub={t.byName||'Name or photo'} color="#c1623f" onClick={onAdd} accent/>
        <BigAction icon="⚙️" label={t.settings||'Settings'} sub={t.profileInfo||'Profile & prefs'} color="#5a6e44" onClick={onSettings}/>
      </div>

      {/* Recent plants */}
      {recentPlants.length > 0 && (
        <div style={hv.recent}>
          <div style={hv.secHdr}>
            <h2 style={hv.secTitle}>{t.myGarden||'Recent Plants'}</h2>
            <button style={hv.seeAll} onClick={onGarden}>{t.all||'See all'} →</button>
          </div>
          <div style={hv.recentGrid}>
            {recentPlants.map((p,i) => (
              <div key={p.id} style={hv.rcard} className="animate-fadeUp" onClick={()=>onPlantClick(p.id)}>
                <div style={hv.rcImg}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.plant_name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:14,transition:'transform 0.3s'}} className="card-img"/>
                    : <div style={{...hv.rcImg,background:'linear-gradient(135deg,#5a6e44,#3d4a2e)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>🌿</div>}
                  {p.difficulty && <span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={{position:'absolute',top:8,right:8,fontSize:11}}>{p.difficulty}</span>}
                </div>
                <h3 style={hv.rcName}>{tn(p.plant_name)}</h3>
                <p style={hv.rcSci}>{p.scientific_name}</p>
                <p style={hv.rcDays}>{p.days_growing} {t.daysGrowing||'days'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {plants.length === 0 && !loading && (
        <div style={hv.empty} className="animate-fadeUp">
          <div style={hv.emptyIll}>🌱</div>
          <h2 style={hv.emptyTitle}>{t.gardenEmpty}</h2>
          <p style={hv.emptySub}>{t.gardenEmptyDesc}</p>
          <button className="btn btn-primary" style={{marginTop:24,padding:'14px 32px',fontSize:16,borderRadius:14}} onClick={onAdd}>
            {t.addFirstPlant}
          </button>
        </div>
      )}

      <div style={{height:100}}/>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div style={sc.card}>
      <span style={sc.icon}>{icon}</span>
      <span style={sc.val}>{value}</span>
      <span style={sc.lbl}>{label}</span>
    </div>
  );
}

function BigAction({ icon, label, sub, color, onClick, accent }) {
  return (
    <button style={{...ba.btn,...(accent?{background:color,color:'#fff',boxShadow:`0 8px 24px ${color}40`}:{background:'var(--surface)',border:'1.5px solid var(--border-mid)'})}} onClick={onClick}>
      <div style={{...ba.iconWrap, background: accent?'rgba(255,255,255,0.15)':`${color}18`}}>
        <span style={ba.iconText}>{icon}</span>
      </div>
      <div style={ba.textWrap}>
        <span style={{...ba.label, color: accent?'#fff':color}}>{label}</span>
        <span style={{...ba.sub, color: accent?'rgba(255,255,255,0.7)':'var(--text-3)'}}>{sub}</span>
      </div>
      <span style={{...ba.arrow, color: accent?'rgba(255,255,255,0.6)':'var(--text-3)'}}>›</span>
    </button>
  );
}

/* ── Garden View ── */
function GardenView({ plants, loading, t, tn, search, setSearch, filterDiff, setFilterDiff, DIFFS, diffLabels, dc, wateringId, onBack, onAdd, onPlantClick, onWater, onDelete }) {
  return (
    <div style={gv.page}>
      <div style={gv.hdr}>
        <button style={gv.back} onClick={onBack}>← {t.back||'Back'}</button>
        <h1 style={gv.title}>{t.myGarden||'My Garden'}</h1>
        <button style={gv.addBtn} onClick={onAdd}>+ {t.addPlant||'Add'}</button>
      </div>

      <div style={gv.searchRow}>
        <input className="input" placeholder={t.searchPlants||'Search...'} value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1}}/>
      </div>

      <div style={gv.filters}>
        {DIFFS.map(d=>(
          <button key={d} style={{...gv.chip,...(filterDiff===d?gv.chipOn:{})}} onClick={()=>setFilterDiff(d)}>
            {diffLabels[d]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : plants.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'var(--text-3)'}}>
          <p style={{fontSize:40,marginBottom:12}}>🔍</p><p>{t.noMatch}</p>
        </div>
      ) : (
        <div style={gv.grid}>
          {plants.map((p,i) => (
            <div key={p.id} className="card animate-fadeUp" style={{...gv.card,animationDelay:`${i*0.05}s`}} onClick={()=>onPlantClick(p.id)}>
              <div style={gv.imgWrap}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.plant_name} style={gv.img} className="card-img"/>
                  : <div style={{...gv.imgWrap,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,background:'linear-gradient(135deg,#eee8de,#ddd5c5)'}}>🌿</div>}
                <div style={gv.imgOv}/>
                {p.difficulty && <span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={{position:'absolute',top:10,right:10,fontSize:11}}>{t[p.difficulty?.toLowerCase()]||p.difficulty}</span>}
                <div style={gv.cardActions} className="card-actions">
                  <button style={{...gv.actBtn,...(wateringId===p.id?{background:'rgba(90,110,68,0.8)'}:{})}} onClick={e=>onWater(e,p)}>
                    {wateringId===p.id?'✓':'💧'}
                  </button>
                  <button style={{...gv.actBtn,background:'rgba(193,98,63,0.7)'}} onClick={e=>{e.stopPropagation();onDelete(p.id);}}>
                    🗑️
                  </button>
                </div>
              </div>
              <div style={gv.info}>
                <h3 style={gv.pname}>{tn(p.plant_name)}</h3>
                {p.scientific_name && <p style={gv.sci}>{p.scientific_name}</p>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                  <p style={gv.days}>🗓 {p.days_growing} {t.daysGrowing}</p>
                  <button style={{...gv.waterBtn,...(wateringId===p.id?{background:'rgba(90,110,68,0.12)',color:'var(--olive-mid)'}:{})}} onClick={e=>onWater(e,p)}>
                    {wateringId===p.id?t.watered:t.waterLog}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{height:100}}/>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button style={{...nb.btn,...(active?nb.btnActive:{})}} onClick={onClick}>
      <span style={{fontSize:22}}>{icon}</span>
      <span style={nb.label}>{label}</span>
    </button>
  );
}

/* ── Styles ── */
const pg = {
  wrap:    {minHeight:'100vh',background:'var(--bg)',paddingBottom:0},
  nav:     {position:'sticky',top:0,zIndex:100,background:'rgba(247,243,238,0.9)',backdropFilter:'blur(16px)',borderBottom:'1px solid var(--border)',padding:'0 20px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'},
  navL:    {display:'flex',alignItems:'center',gap:10},
  navLeaf: {fontSize:22},
  navBrand:{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--olive)',letterSpacing:'-0.01em'},
  navR:    {display:'flex',alignItems:'center',gap:10},
  langRow: {display:'flex',gap:3},
  langBtn: {padding:'4px 10px',borderRadius:100,border:'1px solid var(--border-mid)',background:'transparent',cursor:'pointer',fontSize:12,color:'var(--text-3)',fontFamily:'var(--font-body)',transition:'all 0.2s'},
  langOn:  {background:'var(--olive)',color:'#f7f3ee',borderColor:'var(--olive)',fontWeight:600},
  navIcon: {background:'none',border:'none',cursor:'pointer',fontSize:20,position:'relative',padding:4},
  badge:   {position:'absolute',top:0,right:0,background:'var(--terra)',color:'white',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  bnav:    {position:'fixed',bottom:0,left:0,right:0,background:'rgba(247,243,238,0.95)',backdropFilter:'blur(16px)',borderTop:'1px solid var(--border)',padding:'10px 32px 20px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  fab:     {width:58,height:58,borderRadius:'50%',background:'linear-gradient(135deg,var(--olive-mid),var(--olive))',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(61,74,46,0.35)',transition:'all 0.2s',marginTop:-16},
  fabPlus: {fontSize:28,color:'#f7f3ee',fontWeight:300,lineHeight:1},
};

const nb = {
  btn:    {display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:'none',border:'none',cursor:'pointer',padding:'8px 20px',borderRadius:12,transition:'all 0.2s'},
  btnActive:{},
  label:  {fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-body)'},
};

const hv = {
  page:   {maxWidth:600,margin:'0 auto',padding:'0 20px'},
  hero:   {position:'relative',padding:'40px 28px 32px',margin:'20px 0 16px',background:'linear-gradient(135deg,var(--olive) 0%,var(--olive-mid) 100%)',borderRadius:24,overflow:'hidden',color:'white'},
  heroDecor1:{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.06)'},
  heroDecor2:{position:'absolute',bottom:-30,left:-30,width:120,height:120,borderRadius:'50%',background:'rgba(193,98,63,0.2)'},
  greet:  {fontSize:14,color:'rgba(255,255,255,0.7)',marginBottom:4,letterSpacing:'0.03em'},
  name:   {fontFamily:'var(--font-display)',fontSize:40,fontWeight:600,color:'white',marginBottom:6,letterSpacing:'-0.01em'},
  sub:    {fontSize:15,color:'rgba(255,255,255,0.75)'},
  stats:  {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20},
  actions:{display:'flex',flexDirection:'column',gap:12,marginBottom:28},
  recent: {marginBottom:24},
  secHdr: {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  secTitle:{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--text-1)'},
  seeAll: {background:'none',border:'none',color:'var(--olive-mid)',fontSize:14,fontWeight:500,cursor:'pointer'},
  recentGrid:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12},
  rcard:  {cursor:'pointer',transition:'transform 0.2s'},
  rcImg:  {position:'relative',height:100,borderRadius:14,overflow:'hidden',marginBottom:8,background:'var(--bg-deep)'},
  rcName: {fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,color:'var(--text-1)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  rcSci:  {fontSize:11,fontStyle:'italic',color:'var(--text-3)',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  rcDays: {fontSize:11,color:'var(--text-3)'},
  empty:  {textAlign:'center',padding:'40px 20px'},
  emptyIll:{fontSize:72,marginBottom:20},
  emptyTitle:{fontFamily:'var(--font-display)',fontSize:28,fontWeight:600,color:'var(--text-1)',marginBottom:10},
  emptySub:{color:'var(--text-3)',lineHeight:1.6,maxWidth:300,margin:'0 auto'},
};

const sc = {
  card: {background:'var(--surface)',borderRadius:16,border:'1px solid var(--border)',padding:'14px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:4},
  icon: {fontSize:22,marginBottom:2},
  val:  {fontFamily:'var(--font-display)',fontSize:26,fontWeight:600,color:'var(--text-1)',lineHeight:1},
  lbl:  {fontSize:11,color:'var(--text-3)',textAlign:'center'},
};

const ba = {
  btn:    {display:'flex',alignItems:'center',gap:14,width:'100%',padding:'16px 18px',borderRadius:18,border:'none',cursor:'pointer',textAlign:'left',transition:'all 0.22s',background:'var(--surface)'},
  iconWrap:{width:48,height:48,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  iconText:{fontSize:24},
  textWrap:{flex:1,display:'flex',flexDirection:'column',gap:2},
  label:  {fontSize:16,fontWeight:600,fontFamily:'var(--font-body)'},
  sub:    {fontSize:13},
  arrow:  {fontSize:22,marginLeft:4},
};

const gv = {
  page:   {maxWidth:800,margin:'0 auto',padding:'0 16px'},
  hdr:    {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 0 16px'},
  back:   {background:'none',border:'none',cursor:'pointer',color:'var(--olive-mid)',fontSize:14,fontWeight:500},
  title:  {fontFamily:'var(--font-display)',fontSize:24,fontWeight:600,color:'var(--text-1)'},
  addBtn: {background:'var(--olive)',color:'white',border:'none',borderRadius:100,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer'},
  searchRow:{marginBottom:12},
  filters:{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'},
  chip:   {padding:'6px 14px',borderRadius:100,border:'1.5px solid var(--border-mid)',background:'var(--surface)',color:'var(--text-3)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.15s'},
  chipOn: {background:'var(--olive)',borderColor:'var(--olive)',color:'white'},
  grid:   {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16},
  card:   {overflow:'hidden',cursor:'pointer'},
  imgWrap:{position:'relative',height:160,overflow:'hidden',background:'var(--bg-deep)',borderRadius:'20px 20px 0 0'},
  img:    {width:'100%',height:'100%',objectFit:'cover'},
  imgOv:  {position:'absolute',inset:0,background:'linear-gradient(to top,rgba(30,30,24,0.2),transparent)'},
  cardActions:{position:'absolute',top:8,left:8,display:'flex',gap:6,opacity:0,transition:'opacity 0.2s'},
  actBtn: {width:32,height:32,borderRadius:10,border:'none',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',color:'white',transition:'all 0.2s'},
  info:   {padding:'12px 16px 16px'},
  pname:  {fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-1)',marginBottom:2},
  sci:    {fontSize:12,fontStyle:'italic',color:'var(--text-3)',marginBottom:4},
  days:   {fontSize:13,color:'var(--text-2)'},
  waterBtn:{fontSize:12,fontWeight:500,padding:'5px 12px',borderRadius:100,border:'1px solid var(--border-mid)',background:'var(--surface-2)',color:'var(--olive-mid)',cursor:'pointer',transition:'all 0.2s',whiteSpace:'nowrap'},
};

const mo = {
  bd:    {position:'fixed',inset:0,background:'rgba(30,30,24,0.5)',backdropFilter:'blur(6px)',zIndex:200},
  box:   {position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--surface)',borderRadius:24,padding:'32px 28px',zIndex:201,width:'min(90vw,380px)',textAlign:'center',boxShadow:'var(--shadow-lg)'},
  title: {fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--text-1)',marginBottom:8},
  desc:  {color:'var(--text-3)',fontSize:14,lineHeight:1.6},
  delBtn:{padding:'13px 24px',borderRadius:100,border:'none',background:'var(--terra)',color:'white',fontSize:15,fontWeight:600,cursor:'pointer'},
};