import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getUserPlants, getNotifications, markAllNotificationsRead, deletePlant, addJournalEntry } from '../lib/api';
import AddPlantModal from '../components/AddPlantModal';
import NotificationPanel from '../components/NotificationPanel';
import SettingsPanel from '../components/SettingsPanel';

const LANG_NAMES = { en:'EN', hi:'हि', kn:'ಕ' };

function SunflowerSVG({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {Array.from({length:12}).map((_,i) => {
        const a = (i*30)*Math.PI/180, cx=40+Math.cos(a)*22, cy=40+Math.sin(a)*22;
        return <ellipse key={i} cx={cx} cy={cy} rx="7" ry="11" fill="var(--gold)" opacity="0.9" transform={`rotate(${i*30} ${cx} ${cy})`}/>;
      })}
      <circle cx="40" cy="40" r="13" fill="#5a3e1b"/>
      <circle cx="40" cy="40" r="10" fill="#3d2a10"/>
      {[[36,36],[40,34],[44,36],[45,40],[44,44],[40,46],[36,44],[35,40],[40,40]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.4" fill="#6b4a20" opacity="0.8"/>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { lang, switchLang, t, tn, translateNames } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [wateringId, setWateringId] = useState(null);
  const [view, setView] = useState('home');
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('All');

  useEffect(() => { if (user) { fetchPlants(); fetchNotifs(); } }, [user]);
  useEffect(() => { if (plants.length > 0) translateNames(plants.map(p => p.plant_name)); }, [lang, plants.length]);

  async function fetchPlants() {
    try { const r = await getUserPlants(user.id); const d = r.data||[]; setPlants(d); if(d.length) translateNames(d.map(p=>p.plant_name)); }
    catch(e){} finally { setLoading(false); }
  }
  async function fetchNotifs() {
    try { const r = await getNotifications(user.id); setNotifications((r.data||[]).filter(n=>!n.read)); } catch(e){}
  }
  function onPlantAdded(p) { setPlants(prev=>[p,...prev]); setShowAdd(false); navigate(`/plant/${p.id}`); }
  async function handleDelete(id) {
    try { await deletePlant(id); setPlants(prev=>prev.filter(p=>p.id!==id)); setDeleteConfirm(null); } catch(e){}
  }
  async function handleWaterLog(e, plant) {
    e.stopPropagation(); setWateringId(plant.id);
    try { await addJournalEntry({plantId:plant.id,userId:user.id,note:`💧 Watered ${plant.plant_name}`,imageBase64:null,imageMimeType:null}); setTimeout(()=>setWateringId(null),1500); }
    catch(e){setWateringId(null);}
  }

  const DIFFS = ['All','Beginner','Intermediate','Expert'];
  const diffLabels = {All:t.all,Beginner:t.beginner,Intermediate:t.intermediate,Expert:t.expert};
  const dc = {Beginner:'badge-green',Intermediate:'badge-amber',Expert:'badge-red'};
  const filtered = plants.filter(p => {
    const n = tn(p.plant_name);
    return (n.toLowerCase().includes(search.toLowerCase()) || p.plant_name.toLowerCase().includes(search.toLowerCase())) &&
           (filterDiff==='All' || p.difficulty===filterDiff);
  });

  return (
    <div style={pg.wrap}>
      {/* ── Top Nav ── */}
      <nav style={pg.nav}>
        <div style={pg.navL}>
          <SunflowerSVG size={30}/>
          <span style={pg.navBrand}>PlantWise</span>
        </div>
        <div style={pg.navR}>
          <div style={pg.langRow}>
            {Object.entries(LANG_NAMES).map(([code,lbl])=>(
              <button key={code} style={{...pg.langBtn,...(lang===code?pg.langOn:{})}} onClick={()=>switchLang(code)}>{lbl}</button>
            ))}
          </div>
          {/* Theme toggle */}
          <button style={pg.themeBtn} onClick={toggleTheme} title="Toggle theme">
            {theme==='light' ? '🌙' : '☀️'}
          </button>
          {/* Notifications */}
          <button style={pg.navIcon} onClick={()=>setShowNotifs(true)}>
            🔔{notifications.length>0&&<span style={pg.badge}>{notifications.length}</span>}
          </button>
        </div>
      </nav>

      {/* ── Desktop sidebar layout ── */}
      <div style={pg.layout}>
        {/* Desktop sidebar nav */}
        <aside style={pg.sidebar} className="hide-mobile">
          <SidebarItem icon="🏡" label={t.garden||'Home'} active={view==='home'} onClick={()=>setView('home')}/>
          <SidebarItem icon="🪴" label={t.myGarden||'Garden'} active={view==='garden'} onClick={()=>setView('garden')}/>
          <SidebarItem icon="✦" label={t.addPlant||'Add Plant'} onClick={()=>setShowAdd(true)} accent/>
          <SidebarItem icon="⚙️" label={t.settings||'Settings'} onClick={()=>setShowSettings(true)}/>
        </aside>

        {/* ── Main content ── */}
        <main style={pg.main}>
          {view==='home' ? (
            <HomeView
              user={user} plants={plants} loading={loading} t={t} tn={tn} dc={dc}
              onGarden={()=>setView('garden')} onAdd={()=>setShowAdd(true)}
              onPlantClick={id=>navigate(`/plant/${id}`)}
              onWater={handleWaterLog} wateringId={wateringId}
              onDelete={id=>setDeleteConfirm(id)}
            />
          ) : (
            <GardenView
              plants={filtered} loading={loading} t={t} tn={tn} dc={dc}
              search={search} setSearch={setSearch}
              filterDiff={filterDiff} setFilterDiff={setFilterDiff}
              DIFFS={DIFFS} diffLabels={diffLabels}
              wateringId={wateringId}
              onBack={()=>setView('home')} onAdd={()=>setShowAdd(true)}
              onPlantClick={id=>navigate(`/plant/${id}`)}
              onWater={handleWaterLog} onDelete={id=>setDeleteConfirm(id)}
            />
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <div style={pg.bnav} className="hide-desktop">
        <MobileNavBtn icon="🏡" label={t.garden||'Home'} active={view==='home'} onClick={()=>setView('home')}/>
        <button style={pg.fab} onClick={()=>setShowAdd(true)}><span style={pg.fabPlus}>+</span></button>
        <MobileNavBtn icon="⚙️" label={t.settings||'Settings'} onClick={()=>setShowSettings(true)}/>
      </div>

      {/* ── Delete modal ── */}
      {deleteConfirm && (
        <><div style={mo.bd} onClick={()=>setDeleteConfirm(null)}/>
        <div style={mo.box} className="animate-growIn">
          <div style={{fontSize:44,marginBottom:14}}>🌿</div>
          <h3 style={mo.title}>{t.deletePlant}</h3>
          <p style={mo.desc}>{t.deleteDesc}</p>
          <div style={{display:'flex',gap:12,marginTop:24}}>
            <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeleteConfirm(null)}>{t.cancel}</button>
            <button style={{...mo.delBtn,flex:1}} onClick={()=>handleDelete(deleteConfirm)}>{t.delete}</button>
          </div>
        </div></>
      )}

      {showAdd      && <AddPlantModal userId={user.id} onClose={()=>setShowAdd(false)} onPlantAdded={onPlantAdded}/>}
      {showNotifs   && <NotificationPanel notifications={notifications} userId={user.id} onClose={()=>setShowNotifs(false)} onMarkAllRead={()=>{markAllNotificationsRead(user.id);setNotifications([]);}}/>}
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}

/* ── Home View ── */
function HomeView({ user, plants, loading, t, tn, dc, onGarden, onAdd, onPlantClick, onWater, wateringId, onDelete }) {
  const hour = new Date().getHours();
  const greetEmoji = hour<12?'🌅':hour<17?'☀️':'🌙';
  const greetWord = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Gardener';
  const totalDays = plants.reduce((a,p)=>a+(p.days_growing||0),0);
  const withGuides = plants.filter(p=>p.care_guide).length;
  const recentPlants = plants.slice(0,4);

  return (
    <div style={hv.page}>
      {/* Hero */}
      <div style={hv.hero} className="animate-fadeUp">
        <div style={hv.heroCircle1}/><div style={hv.heroCircle2}/>
        <div style={hv.heroLeaf}>🌿</div>
        <p style={hv.greetSmall}>{greetEmoji} {greetWord}</p>
        <h1 style={hv.heroName}>{firstName}</h1>
        <p style={hv.heroSub}>
          {plants.length===0 ? t.startByAdding : `${t.youreGrowing} ${plants.length} ${plants.length!==1?t.plants:t.plant}`}
        </p>
        {plants.length > 0 && (
          <div style={hv.heroStats}>
            <div style={hv.hstat}><span style={hv.hstatVal}>{plants.length}</span><span style={hv.hstatLbl}>{t.plants}</span></div>
            <div style={hv.hstatDiv}/>
            <div style={hv.hstat}><span style={hv.hstatVal}>{totalDays}</span><span style={hv.hstatLbl}>{t.daysGrowing}</span></div>
            <div style={hv.hstatDiv}/>
            <div style={hv.hstat}><span style={hv.hstatVal}>{withGuides}</span><span style={hv.hstatLbl}>{t.careGuide}</span></div>
          </div>
        )}
        <button style={hv.addHeroBtn} onClick={onAdd}>✦ {t.addPlant}</button>
      </div>

      {/* Quick tips / interactive cards */}
      <div style={hv.tipsRow} className="animate-fadeUp">
        <TipCard icon="💧" title={t.watering||'Watering'} tip="Check soil moisture before watering — stick your finger 1 inch deep." color="#4a90d9"/>
        <TipCard icon="☀️" title={t.sunlight||'Sunlight'} tip="Rotate plants weekly for even light exposure and balanced growth." color="var(--gold)"/>
        <TipCard icon="🌡️" title={t.temperature||'Temperature'} tip="Most houseplants thrive between 18–24°C. Avoid cold drafts." color="var(--terra)"/>
      </div>

      {/* Recent plants */}
      {recentPlants.length > 0 && (
        <div style={hv.recentSec} className="animate-fadeUp">
          <div style={hv.secRow}>
            <h2 style={hv.secTitle}>🌱 {t.myGarden}</h2>
            <button style={hv.seeAll} onClick={onGarden}>{t.all} →</button>
          </div>
          <div style={hv.recentGrid}>
            {recentPlants.map((p,i) => (
              <div key={p.id} style={hv.rcard} className="animate-fadeUp card" onClick={()=>onPlantClick(p.id)}>
                <div style={hv.rcImgWrap}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.plant_name} style={hv.rcImg} className="card-img"/>
                    : <div style={{...hv.rcImgWrap,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,background:'linear-gradient(135deg,var(--surface-2),var(--surface-3))'}}>🌿</div>}
                  {p.difficulty&&<span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={{position:'absolute',top:8,right:8,fontSize:11}}>{p.difficulty}</span>}
                  {/* Hover actions */}
                  <div style={hv.rcActions} className="card-actions">
                    <button style={{...hv.rcActBtn,...(wateringId===p.id?{background:'rgba(90,110,68,0.8)'}:{})}} onClick={e=>onWater(e,p)}>
                      {wateringId===p.id?'✓':'💧'}
                    </button>
                    <button style={{...hv.rcActBtn,background:'rgba(193,98,63,0.7)'}} onClick={e=>{e.stopPropagation();onDelete(p.id);}}>🗑️</button>
                  </div>
                </div>
                <div style={hv.rcInfo}>
                  <h3 style={hv.rcName}>{tn(p.plant_name)}</h3>
                  <p style={hv.rcSci}>{p.scientific_name}</p>
                  <p style={hv.rcDays}>🗓 {p.days_growing} {t.daysGrowing}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {plants.length===0 && !loading && (
        <div style={hv.empty} className="animate-fadeUp">
          <div style={hv.emptyIll}>🌱</div>
          <h2 style={hv.emptyTitle}>{t.gardenEmpty}</h2>
          <p style={hv.emptySub}>{t.gardenEmptyDesc}</p>
          <button className="btn btn-primary" style={{marginTop:24,borderRadius:14,padding:'14px 32px',fontSize:16}} onClick={onAdd}>{t.addFirstPlant}</button>
        </div>
      )}
      <div style={{height:100}}/>
    </div>
  );
}

function TipCard({ icon, title, tip, color }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{...tc.card,borderTop:`3px solid ${color}`}} onClick={()=>setFlipped(f=>!f)}>
      <div style={tc.iconRow}>
        <span style={{fontSize:22}}>{icon}</span>
        <span style={{...tc.title,color}}>{title}</span>
        <span style={tc.flip}>{flipped?'✕':'💡'}</span>
      </div>
      {flipped && <p style={tc.tip} className="animate-fadeIn">{tip}</p>}
      {!flipped && <p style={tc.hint}>Tap for a tip</p>}
    </div>
  );
}

/* ── Garden View ── */
function GardenView({ plants, loading, t, tn, dc, search, setSearch, filterDiff, setFilterDiff, DIFFS, diffLabels, wateringId, onBack, onAdd, onPlantClick, onWater, onDelete }) {
  return (
    <div style={gv.page}>
      <div style={gv.hdr}>
        <button style={gv.back} onClick={onBack} className="hide-desktop">← {t.back}</button>
        <h1 style={gv.title}>{t.myGarden}</h1>
        <button style={gv.addBtn} onClick={onAdd} className="hide-mobile">+ {t.addPlant}</button>
      </div>
      <input className="input" placeholder={t.searchPlants} value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12}}/>
      <div style={gv.filters}>
        {DIFFS.map(d=>(
          <button key={d} style={{...gv.chip,...(filterDiff===d?gv.chipOn:{})}} onClick={()=>setFilterDiff(d)}>{diffLabels[d]}</button>
        ))}
      </div>
      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : plants.length===0 ? (
        <div style={{textAlign:'center',padding:60,color:'var(--text-3)'}}><p style={{fontSize:40,marginBottom:12}}>🔍</p><p>{t.noMatch}</p></div>
      ) : (
        <div style={gv.grid}>
          {plants.map((p,i)=>(
            <div key={p.id} className="card animate-fadeUp" style={{...gv.card,animationDelay:`${i*0.05}s`}} onClick={()=>onPlantClick(p.id)}>
              <div style={gv.imgWrap}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.plant_name} style={gv.img} className="card-img"/>
                  : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,background:'linear-gradient(135deg,var(--surface-2),var(--bg-deep))'}}>🌿</div>}
                <div style={gv.imgOv}/>
                {p.difficulty&&<span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={{position:'absolute',top:10,right:10,fontSize:11}}>{t[p.difficulty?.toLowerCase()]||p.difficulty}</span>}
                <div style={gv.cardActions} className="card-actions">
                  <button style={{...gv.actBtn,...(wateringId===p.id?{background:'rgba(90,110,68,0.8)'}:{})}} onClick={e=>onWater(e,p)}>
                    {wateringId===p.id?'✓':'💧'}
                  </button>
                  <button style={{...gv.actBtn,background:'rgba(193,98,63,0.7)'}} onClick={e=>{e.stopPropagation();onDelete(p.id);}}>🗑️</button>
                </div>
              </div>
              <div style={gv.info}>
                <h3 style={gv.pname}>{tn(p.plant_name)}</h3>
                {p.scientific_name&&<p style={gv.sci}>{p.scientific_name}</p>}
                <p style={gv.days}>🗓 {p.days_growing} {t.daysGrowing}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{height:100}}/>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, accent }) {
  return (
    <button style={{...sb.item,...(active?sb.itemActive:{}),...(accent?{color:'var(--terra)'}:{})}} onClick={onClick}>
      <span style={sb.icon}>{icon}</span>
      <span style={sb.label}>{label}</span>
    </button>
  );
}

function MobileNavBtn({ icon, label, active, onClick }) {
  return (
    <button style={{...nb.btn,...(active?nb.active:{})}} onClick={onClick}>
      <span style={{fontSize:22}}>{icon}</span>
      <span style={nb.label}>{label}</span>
    </button>
  );
}

/* ── Styles ── */
const pg = {
  wrap:    {minHeight:'100vh',background:'var(--bg)'},
  nav:     {position:'sticky',top:0,zIndex:100,background:'var(--nav-bg)',backdropFilter:'blur(16px)',borderBottom:'1px solid var(--border)',padding:'0 20px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'},
  navL:    {display:'flex',alignItems:'center',gap:10},
  navBrand:{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:600,color:'var(--olive)',letterSpacing:'-0.01em'},
  navR:    {display:'flex',alignItems:'center',gap:8},
  langRow: {display:'flex',gap:3},
  langBtn: {padding:'4px 9px',borderRadius:100,border:'1px solid var(--border-mid)',background:'transparent',cursor:'pointer',fontSize:12,color:'var(--text-3)',fontFamily:"'Outfit',system-ui,sans-serif",transition:'all 0.2s'},
  langOn:  {background:'var(--olive)',color:'var(--text-inv)',borderColor:'var(--olive)',fontWeight:600},
  themeBtn:{background:'none',border:'none',cursor:'pointer',fontSize:18,padding:'4px 6px',borderRadius:8,transition:'all 0.2s'},
  navIcon: {background:'none',border:'none',cursor:'pointer',fontSize:18,position:'relative',padding:4},
  badge:   {position:'absolute',top:0,right:0,background:'var(--terra)',color:'white',borderRadius:'50%',width:15,height:15,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  layout:  {display:'flex',minHeight:'calc(100vh - 60px)'},
  sidebar: {width:220,background:'var(--surface)',borderRight:'1px solid var(--border)',padding:'24px 12px',display:'flex',flexDirection:'column',gap:4,position:'sticky',top:60,height:'calc(100vh - 60px)',flexShrink:0},
  main:    {flex:1,overflow:'auto'},
  bnav:    {position:'fixed',bottom:0,left:0,right:0,background:'var(--nav-bg)',backdropFilter:'blur(16px)',borderTop:'1px solid var(--border)',padding:'8px 24px 18px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  fab:     {width:54,height:54,borderRadius:'50%',background:'linear-gradient(135deg,var(--olive-mid),var(--olive))',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 20px rgba(61,74,46,0.35)',marginTop:-14},
  fabPlus: {fontSize:26,color:'var(--text-inv)',fontWeight:300,lineHeight:1},
};

const sb = {
  item:       {display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:12,border:'none',background:'transparent',cursor:'pointer',width:'100%',textAlign:'left',transition:'all 0.18s',color:'var(--text-2)',fontFamily:"'Outfit',system-ui,sans-serif",fontSize:15},
  itemActive: {background:'rgba(61,74,46,0.1)',color:'var(--olive)',fontWeight:600},
  icon:       {fontSize:20,width:24,textAlign:'center'},
  label:      {fontSize:14,fontWeight:500},
};

const nb = {
  btn:    {display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:'none',border:'none',cursor:'pointer',padding:'8px 20px',borderRadius:12,transition:'all 0.2s',color:'var(--text-3)'},
  active: {color:'var(--olive)'},
  label:  {fontSize:11,fontFamily:"'Outfit',system-ui,sans-serif"},
};

const hv = {
  page:       {maxWidth:900,margin:'0 auto',padding:'20px 20px 0'},
  hero:       {position:'relative',padding:'36px 32px',marginBottom:20,background:'linear-gradient(140deg,var(--olive) 0%,var(--olive-mid) 100%)',borderRadius:24,overflow:'hidden',color:'white'},
  heroCircle1:{position:'absolute',top:-50,right:-50,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.06)'},
  heroCircle2:{position:'absolute',bottom:-40,left:-40,width:160,height:160,borderRadius:'50%',background:'rgba(193,98,63,0.18)'},
  heroLeaf:   {position:'absolute',right:28,top:'50%',transform:'translateY(-50%)',fontSize:72,opacity:0.2},
  greetSmall: {fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:4,letterSpacing:'0.03em'},
  heroName:   {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:44,fontWeight:600,color:'white',marginBottom:4,letterSpacing:'-0.01em'},
  heroSub:    {fontSize:15,color:'rgba(255,255,255,0.78)',marginBottom:16},
  heroStats:  {display:'flex',alignItems:'center',gap:0,marginBottom:20,background:'rgba(255,255,255,0.12)',borderRadius:14,padding:'12px 20px',backdropFilter:'blur(8px)',width:'fit-content'},
  hstat:      {display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px'},
  hstatVal:   {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,fontWeight:600,color:'white',lineHeight:1},
  hstatLbl:   {fontSize:11,color:'rgba(255,255,255,0.65)',marginTop:3,textAlign:'center'},
  hstatDiv:   {width:1,height:32,background:'rgba(255,255,255,0.2)'},
  addHeroBtn: {display:'inline-flex',alignItems:'center',gap:8,padding:'10px 22px',background:'rgba(255,255,255,0.18)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:100,color:'white',fontSize:14,fontWeight:500,cursor:'pointer',backdropFilter:'blur(8px)',transition:'all 0.2s',fontFamily:"'Outfit',system-ui,sans-serif"},
  tipsRow:    {display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24},
  recentSec:  {marginBottom:24},
  secRow:     {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  secTitle:   {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:600,color:'var(--text-1)'},
  seeAll:     {background:'none',border:'none',color:'var(--olive-mid)',fontSize:14,fontWeight:500,cursor:'pointer'},
  recentGrid: {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14},
  rcard:      {cursor:'pointer',overflow:'hidden',animationDelay:'0.1s'},
  rcImgWrap:  {position:'relative',height:130,overflow:'hidden',background:'var(--surface-2)',borderRadius:'16px 16px 0 0'},
  rcImg:      {width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.3s'},
  rcActions:  {position:'absolute',top:8,left:8,display:'flex',gap:5,opacity:0,transition:'opacity 0.2s'},
  rcActBtn:   {width:30,height:30,borderRadius:9,border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',color:'white',transition:'all 0.2s'},
  rcInfo:     {padding:'10px 14px 14px'},
  rcName:     {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:16,fontWeight:600,color:'var(--text-1)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  rcSci:      {fontSize:11,fontStyle:'italic',color:'var(--text-3)',marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  rcDays:     {fontSize:11,color:'var(--text-3)'},
  empty:      {textAlign:'center',padding:'40px 20px'},
  emptyIll:   {fontSize:72,marginBottom:20},
  emptyTitle: {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:28,fontWeight:600,color:'var(--text-1)',marginBottom:10},
  emptySub:   {color:'var(--text-3)',lineHeight:1.6,maxWidth:300,margin:'0 auto'},
};

const tc = {
  card:   {background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'16px',cursor:'pointer',transition:'all 0.2s',userSelect:'none'},
  iconRow:{display:'flex',alignItems:'center',gap:10,marginBottom:6},
  title:  {fontWeight:600,fontSize:15,flex:1,fontFamily:"'Outfit',system-ui,sans-serif"},
  flip:   {fontSize:16},
  tip:    {fontSize:13,color:'var(--text-2)',lineHeight:1.6},
  hint:   {fontSize:12,color:'var(--text-3)',fontStyle:'italic'},
};

const gv = {
  page:    {maxWidth:900,margin:'0 auto',padding:'20px 20px 0'},
  hdr:     {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  back:    {background:'none',border:'none',cursor:'pointer',color:'var(--olive-mid)',fontSize:14,fontWeight:500},
  title:   {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,fontWeight:600,color:'var(--text-1)'},
  addBtn:  {background:'var(--olive)',color:'var(--text-inv)',border:'none',borderRadius:100,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer'},
  filters: {display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'},
  chip:    {padding:'6px 14px',borderRadius:100,border:'1.5px solid var(--border-mid)',background:'var(--surface)',color:'var(--text-3)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.15s'},
  chipOn:  {background:'var(--olive)',borderColor:'var(--olive)',color:'var(--text-inv)'},
  grid:    {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16},
  card:    {overflow:'hidden',cursor:'pointer'},
  imgWrap: {position:'relative',height:160,overflow:'hidden',background:'var(--surface-2)',borderRadius:'20px 20px 0 0'},
  img:     {width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.3s'},
  imgOv:   {position:'absolute',inset:0,background:'linear-gradient(to top,rgba(30,30,24,0.2),transparent)'},
  cardActions:{position:'absolute',top:8,left:8,display:'flex',gap:5,opacity:0,transition:'opacity 0.2s'},
  actBtn:  {width:32,height:32,borderRadius:10,border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',color:'white',transition:'all 0.2s'},
  info:    {padding:'12px 16px 16px'},
  pname:   {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:18,fontWeight:600,color:'var(--text-1)',marginBottom:2},
  sci:     {fontSize:12,fontStyle:'italic',color:'var(--text-3)',marginBottom:6},
  days:    {fontSize:12,color:'var(--text-3)'},
};

const mo = {
  bd:    {position:'fixed',inset:0,background:'var(--modal-bd)',backdropFilter:'blur(6px)',zIndex:200},
  box:   {position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--surface)',borderRadius:24,padding:'32px 28px',zIndex:201,width:'min(90vw,380px)',textAlign:'center',boxShadow:'var(--shadow-lg)'},
  title: {fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:600,color:'var(--text-1)',marginBottom:8},
  desc:  {color:'var(--text-3)',fontSize:14,lineHeight:1.6},
  delBtn:{padding:'13px 24px',borderRadius:100,border:'none',background:'var(--terra)',color:'white',fontSize:15,fontWeight:600,cursor:'pointer'},
};