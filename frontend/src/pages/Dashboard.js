import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getUserPlants, getNotifications, markAllNotificationsRead, deletePlant, addJournalEntry } from '../lib/api';
import AddPlantModal from '../components/AddPlantModal';
import NotificationPanel from '../components/NotificationPanel';
import SettingsPanel from '../components/SettingsPanel';

const LANG_NAMES = { en:'EN', hi:'हि', kn:'ಕ' };

/* ── Sunflower SVG ── */
function SunflowerSVG({ size=28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {Array.from({length:12}).map((_,i)=>{
        const a=(i*30)*Math.PI/180,cx=40+Math.cos(a)*22,cy=40+Math.sin(a)*22;
        return <ellipse key={i} cx={cx} cy={cy} rx="7" ry="11" fill="var(--amber)" opacity="0.92" transform={`rotate(${i*30} ${cx} ${cy})`}/>;
      })}
      <circle cx="40" cy="40" r="13" fill="#3d2000"/>
      <circle cx="40" cy="40" r="10" fill="#2a1500"/>
      {[[36,36],[40,34],[44,36],[45,40],[44,44],[40,46],[36,44],[35,40],[40,40]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.4" fill="#5a3000" opacity="0.9"/>
      ))}
    </svg>
  );
}

/* ── Animated counter ── */
function Counter({ to, duration=1200 }) {
  const [val, setVal] = useState(0);
  useEffect(()=>{
    let start=0, step=to/60, frame;
    const tick=()=>{ start+=step; if(start>=to){setVal(to);return;} setVal(Math.floor(start)); frame=requestAnimationFrame(tick); };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[to]);
  return <span>{val}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { lang, switchLang, t, tn, translateNames } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [plants, setPlants]         = useState([]);
  const [notifications, setNotifs]  = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [wateringId, setWateringId] = useState(null);
  const [view, setView]   = useState('home');
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('All');

  useEffect(()=>{ if(user){fetchPlants();fetchNotifs();} },[user]);
  useEffect(()=>{ if(plants.length>0) translateNames(plants.map(p=>p.plant_name)); },[lang,plants.length]);

  async function fetchPlants(){
    try{ const r=await getUserPlants(user.id); const d=r.data||[]; setPlants(d); if(d.length) translateNames(d.map(p=>p.plant_name)); }
    catch(e){} finally{setLoading(false);}
  }
  async function fetchNotifs(){
    try{ const r=await getNotifications(user.id); setNotifs((r.data||[]).filter(n=>!n.read)); } catch(e){}
  }
  function onPlantAdded(p){ setPlants(prev=>[p,...prev]); setShowAdd(false); navigate(`/plant/${p.id}`); }
  async function handleDelete(id){
    try{ await deletePlant(id); setPlants(prev=>prev.filter(p=>p.id!==id)); setDeleteConfirm(null); } catch(e){}
  }
  async function handleWater(e,plant){
    e.stopPropagation(); setWateringId(plant.id);
    try{ await addJournalEntry({plantId:plant.id,userId:user.id,note:`💧 Watered ${plant.plant_name}`,imageBase64:null,imageMimeType:null}); setTimeout(()=>setWateringId(null),1800); }
    catch(e){setWateringId(null);}
  }

  const DIFFS=['All','Beginner','Intermediate','Expert'];
  const diffMap={All:t.all,Beginner:t.beginner,Intermediate:t.intermediate,Expert:t.expert};
  const dc={Beginner:'badge-green',Intermediate:'badge-amber',Expert:'badge-red'};
  const filtered=plants.filter(p=>{
    const n=tn(p.plant_name);
    return (n.toLowerCase().includes(search.toLowerCase())||p.plant_name.toLowerCase().includes(search.toLowerCase()))
      &&(filterDiff==='All'||p.difficulty===filterDiff);
  });

  return (
    <div style={pg.root}>
      {/* ─── NAV ─── */}
      <nav style={pg.nav}>
        <button style={pg.brand} onClick={()=>setView('home')}>
          <SunflowerSVG size={28}/>
          <span style={pg.brandTxt}>PlantWise</span>
        </button>
        <div style={pg.navR}>
          <div style={pg.langPill}>
            {Object.entries(LANG_NAMES).map(([c,l])=>(
              <button key={c} style={{...pg.langBtn,...(lang===c?pg.langOn:{})}} onClick={()=>switchLang(c)}>{l}</button>
            ))}
          </div>
          <button style={pg.iconBtn} onClick={toggleTheme} title="Toggle theme">
            <span style={{fontSize:16}}>{theme==='dark'?'☀️':'🌙'}</span>
          </button>
          <button style={{...pg.iconBtn,position:'relative'}} onClick={()=>setShowNotifs(true)}>
            <span style={{fontSize:16}}>🔔</span>
            {notifications.length>0&&<span style={pg.notifDot}>{notifications.length}</span>}
          </button>
        </div>
      </nav>

      {/* ─── LAYOUT ─── */}
      <div style={pg.layout}>
        {/* Desktop Sidebar */}
        <aside style={sidebarStyle} className="hide-mobile">
          {[
            {icon:'🏡', label:t.garden||'Home',    id:'home'},
            {icon:'🪴', label:t.myGarden||'Garden', id:'garden'},
          ].map(item=>(
            <button key={item.id} style={{...sd.btn,...(view===item.id?sd.active:{})}} onClick={()=>setView(item.id)}>
              <span style={sd.icon}>{item.icon}</span>
              <span style={sd.label}>{item.label}</span>
              {view===item.id&&<div style={sd.bar}/>}
            </button>
          ))}
          <div style={sd.divider}/>
          <button style={{...sd.btn,...sd.addBtn}} onClick={()=>setShowAdd(true)}>
            <span style={sd.addIcon}>+</span>
            <span style={sd.label}>{t.addPlant||'Add Plant'}</span>
          </button>
          <button style={sd.btn} onClick={()=>setShowSettings(true)}>
            <span style={sd.icon}>⚙️</span>
            <span style={sd.label}>{t.settings||'Settings'}</span>
          </button>
          <div style={{flex:1}}/>
          <div style={sd.userCard}>
            <div style={sd.avatar}>{(user?.user_metadata?.full_name||user?.email||'?')[0].toUpperCase()}</div>
            <div style={{overflow:'hidden'}}>
              <p style={sd.uname}>{user?.user_metadata?.full_name||'Gardener'}</p>
              <p style={sd.uemail}>{user?.email}</p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={pg.main}>
          {view==='home'
            ? <HomeView user={user} plants={plants} loading={loading} t={t} tn={tn} dc={dc}
                onGarden={()=>setView('garden')} onAdd={()=>setShowAdd(true)}
                onPlantClick={id=>navigate(`/plant/${id}`)}
                onWater={handleWater} wateringId={wateringId} onDelete={id=>setDeleteConfirm(id)}/>
            : <GardenView plants={filtered} loading={loading} t={t} tn={tn} dc={dc}
                search={search} setSearch={setSearch}
                filterDiff={filterDiff} setFilterDiff={setFilterDiff}
                DIFFS={DIFFS} diffMap={diffMap} wateringId={wateringId}
                onAdd={()=>setShowAdd(true)} onPlantClick={id=>navigate(`/plant/${id}`)}
                onWater={handleWater} onDelete={id=>setDeleteConfirm(id)}/>
          }
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav style={pg.bnav} className="hide-desktop">
        <MobileTab icon="🏡" label={t.garden||'Home'} active={view==='home'} onClick={()=>setView('home')}/>
        <button style={pg.fab} onClick={()=>setShowAdd(true)}><span style={{fontSize:28,color:'#fff',lineHeight:1}}>+</span></button>
        <MobileTab icon="⚙️" label={t.settings||'Settings'} onClick={()=>setShowSettings(true)}/>
      </nav>

      {/* Delete modal */}
      {deleteConfirm&&(
        <><div style={mo.bd} onClick={()=>setDeleteConfirm(null)}/>
        <div style={mo.box} className="animate-growIn">
          <div style={mo.emoji}>🗑️</div>
          <h3 style={mo.title}>{t.deletePlant}</h3>
          <p style={mo.desc}>{t.deleteDesc}</p>
          <div style={{display:'flex',gap:12,marginTop:24}}>
            <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeleteConfirm(null)}>{t.cancel}</button>
            <button className="btn btn-danger" style={{flex:1,fontWeight:700}} onClick={()=>handleDelete(deleteConfirm)}>{t.delete}</button>
          </div>
        </div></>
      )}

      {showAdd&&<AddPlantModal userId={user.id} onClose={()=>setShowAdd(false)} onPlantAdded={onPlantAdded}/>}
      {showNotifs&&<NotificationPanel notifications={notifications} userId={user.id} onClose={()=>setShowNotifs(false)} onMarkAllRead={()=>{markAllNotificationsRead(user.id);setNotifs([]);}}/>}
      {showSettings&&<SettingsPanel onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   HOME VIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function HomeView({ user, plants, loading, t, tn, dc, onGarden, onAdd, onPlantClick, onWater, wateringId, onDelete }) {
  const hour = new Date().getHours();
  const greet = hour<5?'Good night 🌙':hour<12?'Good morning 🌅':hour<17?'Good afternoon ☀️':hour<21?'Good evening 🌆':'Good night 🌙';
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Gardener';
  const totalDays = plants.reduce((a,p)=>a+(p.days_growing||0),0);
  const healthyCount = plants.filter(p=>p.care_guide).length;
  const recentPlants = plants.slice(0,6);

  /* Health score: 0-100 */
  const healthScore = plants.length===0?0:Math.min(100,Math.round((healthyCount/plants.length)*70+(plants.length>0?30:0)));

  return (
    <div style={hv.page}>

      {/* ── HERO ── */}
      <div style={hv.hero} className="animate-fadeUp">
        {/* Floating orbs */}
        <div style={hv.orb1} className="animate-float"/>
        <div style={{...hv.orb2,animationDelay:'1.5s'}} className="animate-float"/>
        <div style={{...hv.orb3,animationDelay:'0.8s'}} className="animate-float"/>

        <div style={hv.heroContent}>
          <div style={hv.heroLeft}>
            <p style={hv.greetText}>{greet}</p>
            <h1 style={hv.heroName}>{name}</h1>
            <p style={hv.heroSub}>
              {plants.length===0 ? t.startByAdding : `Your garden has ${plants.length} plant${plants.length!==1?'s':''} growing`}
            </p>
            <button style={hv.heroAddBtn} onClick={onAdd}>
              <span style={{fontSize:18}}>✦</span>
              <span>{t.addPlant}</span>
            </button>
          </div>

          {/* Health orb */}
          <div style={hv.healthOrb}>
            <svg viewBox="0 0 120 120" style={{width:120,height:120,position:'absolute'}}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(82,183,136,0.8)" strokeWidth="8"
                strokeDasharray={`${2*Math.PI*52}`}
                strokeDashoffset={`${2*Math.PI*52*(1-healthScore/100)}`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{transition:'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)'}}/>
            </svg>
            <div style={hv.healthInner}>
              <span style={hv.healthVal}>{healthScore}</span>
              <span style={hv.healthLbl}>Health</span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={hv.statsRow}>
          {[
            {icon:'🌱', val:plants.length, label:t.plants||'Plants'},
            {icon:'🗓', val:totalDays,     label:t.daysGrowing||'Days'},
            {icon:'📋', val:healthyCount,  label:t.careGuide||'Guides'},
          ].map((s,i)=>(
            <div key={i} style={hv.stat}>
              <span style={hv.statIcon}>{s.icon}</span>
              <span style={hv.statVal}><Counter to={s.val}/></span>
              <span style={hv.statLbl}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK TIPS (interactive flip cards) ── */}
      <section style={{...hv.section,animationDelay:'0.1s'}} className="animate-fadeUp">
        <div style={hv.secRow}>
          <h2 style={hv.secTitle}>🌿 Plant Tips</h2>
          <span style={hv.secSub}>Tap to reveal</span>
        </div>
        <div style={hv.tipsGrid}>
          {TIPS.map((tip,i)=><FlipTip key={i} {...tip} delay={i*0.08}/>)}
        </div>
      </section>

      {/* ── SEASON BANNER ── */}
      <SeasonBanner/>

      {/* ── RECENT PLANTS ── */}
      {recentPlants.length>0&&(
        <section style={hv.section} className="animate-fadeUp">
          <div style={hv.secRow}>
            <h2 style={hv.secTitle}>🪴 {t.myGarden}</h2>
            <button style={hv.seeAllBtn} onClick={onGarden}>See all →</button>
          </div>
          <div style={hv.plantGrid}>
            {recentPlants.map((p,i)=>(
              <PlantCard key={p.id} plant={p} tn={tn} dc={dc} t={t}
                wateringId={wateringId} delay={i*0.06}
                onClick={()=>onPlantClick(p.id)}
                onWater={onWater} onDelete={onDelete}/>
            ))}
          </div>
        </section>
      )}

      {/* ── EMPTY STATE ── */}
      {plants.length===0&&!loading&&(
        <div style={hv.empty} className="animate-fadeUp">
          <div style={hv.emptyOrb}>
            <span style={{fontSize:56}}>🌱</span>
          </div>
          <h2 style={hv.emptyTitle}>{t.gardenEmpty}</h2>
          <p style={hv.emptySub}>{t.gardenEmptyDesc}</p>
          <button className="btn btn-primary btn-lg" style={{marginTop:28,borderRadius:16}} onClick={onAdd}>
            ✦ {t.addFirstPlant}
          </button>
        </div>
      )}

      <div style={{height:100}}/>
    </div>
  );
}

/* ── Flip tip card ── */
const TIPS = [
  {icon:'💧', title:'Watering',    front:'Proper hydration is key to plant health.',      back:'Check soil moisture 1" deep before watering. Most plants prefer deep, infrequent watering over shallow daily watering.',     color:'#3a86b4'},
  {icon:'☀️', title:'Sunlight',   front:'Light is food for your plants.',                 back:'Rotate your plants 90° weekly for even growth. South-facing windows get the most light in the northern hemisphere.',          color:'#d4860a'},
  {icon:'🌡️', title:'Temperature', front:'Temperature swings stress plants.',             back:'Keep plants away from AC vents and cold drafts. Most tropicals prefer 18–27°C. Sudden drops cause leaf drop.',               color:'#c0485a'},
  {icon:'🌱', title:'Soil',        front:'Good soil = healthy roots = thriving plant.',   back:'Refresh potting mix every 1–2 years. Add perlite for drainage and worm castings for slow-release nutrients.',                color:'#2d6a4f'},
  {icon:'✂️', title:'Pruning',     front:'Pruning encourages bushier, fuller growth.',    back:'Always cut above a leaf node at 45°. Remove dead or yellowing leaves first. Clean your scissors with alcohol first.',         color:'#7b5ea7'},
  {icon:'🪱', title:'Fertilizing', front:'Feed your plants during their growth season.',  back:'Use a balanced NPK fertilizer (like 10-10-10) every 2–4 weeks in spring/summer. Stop feeding in winter.',                   color:'#5a6e44'},
];

function FlipTip({ icon, title, front, back, color, delay=0 }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{...ft.wrap,animationDelay:`${delay}s`}} className="animate-fadeUp" onClick={()=>setFlipped(f=>!f)}>
      <div style={{...ft.card,...(flipped?ft.flipped:{})}}>
        <div style={ft.face}>
          <div style={{...ft.iconBg,background:`${color}18`,border:`1px solid ${color}30`}}>
            <span style={{fontSize:22}}>{icon}</span>
          </div>
          <p style={{...ft.ttl,color}}>{title}</p>
          <p style={ft.txt}>{front}</p>
          <span style={ft.tap}>Tap →</span>
        </div>
        <div style={{...ft.face,position:'absolute',inset:0,background:`linear-gradient(145deg,${color}18,${color}08)`,border:`1px solid ${color}30`,transform:'rotateY(180deg)',backfaceVisibility:'hidden',borderRadius:18}}>
          <div style={{...ft.iconBg,background:`${color}25`,border:`1px solid ${color}40`}}>
            <span style={{fontSize:22}}>{icon}</span>
          </div>
          <p style={{...ft.ttl,color}}>{title}</p>
          <p style={{...ft.txt,fontSize:12,lineHeight:1.65,color:'var(--text-2)'}}>{back}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Season banner ── */
function SeasonBanner() {
  const month = new Date().getMonth();
  const seasons = [
    {name:'Winter',  icon:'❄️', tip:'Reduce watering frequency. Most plants are dormant. Keep away from cold windows.', color:'#3a86b4'},
    {name:'Winter',  icon:'❄️', tip:'Reduce watering frequency. Most plants are dormant. Keep away from cold windows.', color:'#3a86b4'},
    {name:'Spring',  icon:'🌸', tip:'Start fertilizing again! Repot root-bound plants. Great time to propagate.', color:'#c0485a'},
    {name:'Spring',  icon:'🌸', tip:'Start fertilizing again! Repot root-bound plants. Great time to propagate.', color:'#c0485a'},
    {name:'Spring',  icon:'🌸', tip:'Start fertilizing again! Repot root-bound plants. Great time to propagate.', color:'#c0485a'},
    {name:'Summer',  icon:'☀️', tip:'Water more frequently. Watch for pests. Protect from harsh afternoon sun.', color:'#d4860a'},
    {name:'Summer',  icon:'☀️', tip:'Water more frequently. Watch for pests. Protect from harsh afternoon sun.', color:'#d4860a'},
    {name:'Summer',  icon:'☀️', tip:'Water more frequently. Watch for pests. Protect from harsh afternoon sun.', color:'#d4860a'},
    {name:'Autumn',  icon:'🍂', tip:'Slow down fertilizing. Bring outdoor plants inside before frost.', color:'#c0485a'},
    {name:'Autumn',  icon:'🍂', tip:'Slow down fertilizing. Bring outdoor plants inside before frost.', color:'#c0485a'},
    {name:'Autumn',  icon:'🍂', tip:'Slow down fertilizing. Bring outdoor plants inside before frost.', color:'#c0485a'},
    {name:'Winter',  icon:'❄️', tip:'Reduce watering frequency. Most plants are dormant. Keep away from cold windows.', color:'#3a86b4'},
  ];
  const s = seasons[month];
  return (
    <div style={{...sb.wrap,borderLeft:`4px solid ${s.color}`}} className="animate-fadeUp">
      <div style={sb.left}>
        <span style={sb.icon}>{s.icon}</span>
        <div>
          <p style={sb.label}>{s.name} Care Tip</p>
          <p style={sb.tip}>{s.tip}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Plant card ── */
function PlantCard({ plant:p, tn, dc, t, wateringId, delay, onClick, onWater, onDelete }) {
  return (
    <div className="card animate-fadeUp" style={{...pc.card,animationDelay:`${delay}s`}} onClick={onClick}>
      <div style={pc.imgWrap}>
        {p.image_url
          ? <img src={p.image_url} alt={p.plant_name} style={pc.img} className="card-img"/>
          : <div style={pc.noImg}><span style={{fontSize:44}}>🌿</span></div>}
        <div style={pc.imgOv}/>
        {p.difficulty&&<span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={{position:'absolute',top:10,left:10,fontSize:10}}>{p.difficulty}</span>}
        <div style={pc.actions} className="card-actions">
          <button style={{...pc.actBtn,...(wateringId===p.id?{background:'rgba(82,183,136,0.85)'}:{})}}
            onClick={e=>onWater(e,p)} title="Water">
            {wateringId===p.id?'✓':'💧'}
          </button>
          <button style={{...pc.actBtn,background:'rgba(192,72,90,0.75)'}}
            onClick={e=>{e.stopPropagation();onDelete(p.id);}} title="Delete">
            🗑️
          </button>
        </div>
      </div>
      <div style={pc.info}>
        <h3 style={pc.name}>{tn(p.plant_name)}</h3>
        {p.scientific_name&&<p style={pc.sci}>{p.scientific_name}</p>}
        <div style={pc.footer}>
          <span style={pc.days}>🗓 {p.days_growing}d</span>
          {p.care_guide&&<span style={pc.guide}>📋 Guide</span>}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   GARDEN VIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function GardenView({ plants, loading, t, tn, dc, search, setSearch, filterDiff, setFilterDiff, DIFFS, diffMap, wateringId, onAdd, onPlantClick, onWater, onDelete }) {
  return (
    <div style={gv.page}>
      <div style={gv.hdr} className="animate-fadeUp">
        <div>
          <h1 style={gv.title}>🪴 {t.myGarden}</h1>
          <p style={gv.sub}>{plants.length} {plants.length!==1?t.plants:t.plant||'plant'} in your collection</p>
        </div>
        <button className="btn btn-primary btn-sm hide-mobile" onClick={onAdd}>✦ {t.addPlant}</button>
      </div>

      <div style={gv.controls} className="animate-fadeUp">
        <div style={gv.searchWrap}>
          <span style={gv.searchIcon}>🔍</span>
          <input className="input" placeholder={t.searchPlants||'Search plants...'} value={search}
            onChange={e=>setSearch(e.target.value)} style={{paddingLeft:44,borderRadius:100}}/>
        </div>
        <div style={gv.chips}>
          {DIFFS.map(d=>(
            <button key={d} style={{...gv.chip,...(filterDiff===d?gv.chipOn:{})}} onClick={()=>setFilterDiff(d)}>
              {diffMap[d]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={gv.loadGrid}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={gv.skelCard}>
              <div className="shimmer" style={{height:160,borderRadius:'16px 16px 0 0'}}/>
              <div style={{padding:'12px 14px'}}>
                <div className="shimmer" style={{height:16,borderRadius:8,marginBottom:8,width:'70%'}}/>
                <div className="shimmer" style={{height:12,borderRadius:8,width:'50%'}}/>
              </div>
            </div>
          ))}
        </div>
      ) : plants.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-3)'}}>
          <p style={{fontSize:48,marginBottom:12}}>🔍</p>
          <p style={{fontSize:16}}>{t.noMatch}</p>
        </div>
      ) : (
        <div style={gv.grid}>
          {plants.map((p,i)=>(
            <PlantCard key={p.id} plant={p} tn={tn} dc={dc} t={t}
              wateringId={wateringId} delay={i*0.04}
              onClick={()=>onPlantClick(p.id)} onWater={onWater} onDelete={onDelete}/>
          ))}
        </div>
      )}
      <div style={{height:100}}/>
    </div>
  );
}

function MobileTab({ icon, label, active, onClick }) {
  return (
    <button style={{...mt.btn,...(active?mt.active:{})}} onClick={onClick}>
      <span style={{fontSize:20}}>{icon}</span>
      <span style={mt.label}>{label}</span>
    </button>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   STYLES
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const pg = {
  root:    {minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column'},
  nav:     {position:'sticky',top:0,zIndex:100,background:'var(--nav-bg)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:'1px solid var(--border)',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',flexShrink:0},
  brand:   {display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',padding:0},
  brandTxt:{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:'var(--text-1)',letterSpacing:'-0.02em'},
  navR:    {display:'flex',alignItems:'center',gap:6},
  langPill:{display:'flex',background:'var(--surface-2)',borderRadius:100,padding:3,gap:2,border:'1px solid var(--border-2)'},
  langBtn: {padding:'4px 10px',borderRadius:100,border:'none',background:'transparent',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text-3)',transition:'all 0.18s',fontFamily:"'Manrope',sans-serif"},
  langOn:  {background:'var(--green)',color:'#fff'},
  iconBtn: {width:36,height:36,borderRadius:10,border:'1px solid var(--border-2)',background:'var(--surface-2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'},
  notifDot:{position:'absolute',top:-3,right:-3,background:'var(--rose)',color:'white',borderRadius:'50%',width:16,height:16,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  layout:  {display:'flex',flex:1,overflow:'hidden'},
  main:    {flex:1,overflowY:'auto',overflowX:'hidden'},
  bnav:    {position:'fixed',bottom:0,left:0,right:0,background:'var(--nav-bg)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderTop:'1px solid var(--border)',padding:'8px 20px 16px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  fab:     {width:52,height:52,borderRadius:'50%',background:'var(--grad-accent)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 24px rgba(82,183,136,0.45)',marginBottom:4},
};

const sd = {
  btn:     {display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:14,border:'none',background:'transparent',cursor:'pointer',width:'100%',transition:'all 0.18s',color:'var(--text-2)',fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:500,position:'relative'},
  active:  {background:'var(--green-glow)',color:'var(--green)'},
  icon:    {fontSize:18,width:28,textAlign:'center',flexShrink:0},
  label:   {flex:1,textAlign:'left'},
  bar:     {position:'absolute',right:0,top:'20%',bottom:'20%',width:3,background:'var(--green)',borderRadius:3},
  divider: {height:1,background:'var(--border)',margin:'12px 16px'},
  addBtn:  {color:'var(--green)',fontWeight:700},
  addIcon: {fontSize:22,width:28,textAlign:'center',flexShrink:0,fontWeight:300},
  userCard:{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderTop:'1px solid var(--border)',marginTop:0},
  avatar:  {width:36,height:36,borderRadius:'50%',background:'var(--grad-accent)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,flexShrink:0},
  uname:   {fontSize:13,fontWeight:600,color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:120},
  uemail:  {fontSize:11,color:'var(--text-3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:120},
};

const hv = {
  page:    {maxWidth:1000,margin:'0 auto',padding:'20px 20px 0'},
  hero:    {position:'relative',background:'var(--grad-hero)',borderRadius:24,padding:'36px 32px 0',marginBottom:20,overflow:'hidden',minHeight:200},
  orb1:    {position:'absolute',top:-60,right:-60,width:220,height:220,borderRadius:'50%',background:'rgba(82,183,136,0.15)',filter:'blur(40px)',pointerEvents:'none'},
  orb2:    {position:'absolute',bottom:-40,left:40,width:160,height:160,borderRadius:'50%',background:'rgba(212,134,10,0.2)',filter:'blur(30px)',pointerEvents:'none'},
  orb3:    {position:'absolute',top:'30%',left:'40%',width:120,height:120,borderRadius:'50%',background:'rgba(82,183,136,0.1)',filter:'blur(20px)',pointerEvents:'none'},
  heroContent:{position:'relative',zIndex:2,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:20},
  heroLeft:{flex:1,minWidth:200},
  greetText:{fontSize:13,color:'rgba(255,255,255,0.65)',fontWeight:500,letterSpacing:'0.04em',marginBottom:4},
  heroName: {fontFamily:"'Syne',sans-serif",fontSize:44,fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:8,letterSpacing:'-0.02em'},
  heroSub:  {fontSize:15,color:'rgba(255,255,255,0.72)',marginBottom:24},
  heroAddBtn:{display:'inline-flex',alignItems:'center',gap:8,padding:'11px 22px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:100,color:'white',fontSize:14,fontWeight:600,cursor:'pointer',backdropFilter:'blur(10px)',transition:'all 0.22s',fontFamily:"'Manrope',sans-serif"},
  healthOrb: {position:'relative',width:120,height:120,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  healthInner:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'},
  healthVal: {fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:'white',lineHeight:1},
  healthLbl: {fontSize:10,color:'rgba(255,255,255,0.6)',letterSpacing:'0.08em',textTransform:'uppercase'},
  statsRow:  {position:'relative',zIndex:2,display:'flex',gap:0,marginTop:24,borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:20,paddingBottom:20},
  stat:      {flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,borderRight:'1px solid rgba(255,255,255,0.08)'},
  statIcon:  {fontSize:18},
  statVal:   {fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:700,color:'white',lineHeight:1},
  statLbl:   {fontSize:11,color:'rgba(255,255,255,0.55)',letterSpacing:'0.04em'},
  section:   {marginBottom:24},
  secRow:    {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  secTitle:  {fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:'var(--text-1)'},
  secSub:    {fontSize:12,color:'var(--text-3)'},
  tipsGrid:  {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12},
  seeAllBtn: {background:'none',border:'none',color:'var(--green-lite)',fontSize:14,fontWeight:600,cursor:'pointer'},
  plantGrid: {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16},
  empty:     {textAlign:'center',padding:'60px 20px'},
  emptyOrb:  {width:120,height:120,borderRadius:'50%',background:'var(--green-glow)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'},
  emptyTitle:{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:700,color:'var(--text-1)',marginBottom:10},
  emptySub:  {color:'var(--text-3)',lineHeight:1.6,maxWidth:300,margin:'0 auto'},
};

const ft = {
  wrap:  {perspective:600,cursor:'pointer',minHeight:150},
  card:  {position:'relative',height:150,transformStyle:'preserve-3d',transition:'transform 0.5s cubic-bezier(0.22,1,0.36,1)'},
  flipped:{transform:'rotateY(180deg)'},
  face:  {position:'absolute',inset:0,background:'var(--surface)',border:'1px solid var(--border-2)',borderRadius:18,padding:'14px',backfaceVisibility:'hidden',display:'flex',flexDirection:'column',gap:6},
  iconBg:{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  ttl:   {fontSize:13,fontWeight:700,letterSpacing:'0.02em'},
  txt:   {fontSize:12,color:'var(--text-3)',lineHeight:1.5,flex:1},
  tap:   {fontSize:10,color:'var(--text-4)',alignSelf:'flex-end'},
};

const sb = {
  wrap:  {background:'var(--surface-2)',borderRadius:16,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center'},
  left:  {display:'flex',alignItems:'flex-start',gap:14,flex:1},
  icon:  {fontSize:28,flexShrink:0},
  label: {fontSize:12,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4},
  tip:   {fontSize:14,color:'var(--text-2)',lineHeight:1.6},
};

const pc = {
  card:    {overflow:'hidden',cursor:'pointer'},
  imgWrap: {position:'relative',height:160,overflow:'hidden',background:'var(--surface-2)',borderRadius:'16px 16px 0 0'},
  img:     {width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.4s cubic-bezier(0.22,1,0.36,1)'},
  noImg:   {width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(145deg,var(--surface-2),var(--surface-3))'},
  imgOv:   {position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,14,11,0.5) 0%,transparent 60%)'},
  actions: {position:'absolute',top:8,right:8,display:'flex',gap:6,opacity:0,transition:'opacity 0.2s'},
  actBtn:  {width:32,height:32,borderRadius:9,border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(8,14,11,0.55)',backdropFilter:'blur(6px)',color:'white',transition:'all 0.2s'},
  info:    {padding:'12px 14px 14px'},
  name:    {fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:'var(--text-1)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  sci:     {fontSize:11,fontStyle:'italic',color:'var(--text-3)',marginBottom:8,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  footer:  {display:'flex',justifyContent:'space-between',alignItems:'center'},
  days:    {fontSize:12,color:'var(--text-3)'},
  guide:   {fontSize:11,color:'var(--green-lite)',fontWeight:600},
};

const gv = {
  page:      {maxWidth:1000,margin:'0 auto',padding:'20px 20px 0'},
  hdr:       {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12},
  title:     {fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:'var(--text-1)',letterSpacing:'-0.02em'},
  sub:       {fontSize:14,color:'var(--text-3)',marginTop:4},
  controls:  {display:'flex',flexDirection:'column',gap:10,marginBottom:20},
  searchWrap:{position:'relative'},
  searchIcon:{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontSize:16,pointerEvents:'none',zIndex:1},
  chips:     {display:'flex',gap:6,flexWrap:'wrap'},
  chip:      {padding:'7px 16px',borderRadius:100,border:'1.5px solid var(--border-2)',background:'var(--surface)',color:'var(--text-3)',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.18s'},
  chipOn:    {background:'var(--green)',borderColor:'var(--green)',color:'white'},
  loadGrid:  {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16},
  skelCard:  {borderRadius:20,overflow:'hidden',border:'1px solid var(--border)'},
  grid:      {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16},
};

const mt = {
  btn:    {display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:'none',border:'none',cursor:'pointer',padding:'8px 20px',borderRadius:12,color:'var(--text-3)',transition:'all 0.18s',fontFamily:"'Manrope',sans-serif"},
  active: {color:'var(--green)'},
  label:  {fontSize:11,fontWeight:600},
};

const mo = {
  bd:    {position:'fixed',inset:0,background:'var(--overlay)',backdropFilter:'blur(8px)',zIndex:200},
  box:   {position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--surface)',borderRadius:24,padding:'32px 28px',zIndex:201,width:'min(90vw,380px)',textAlign:'center',boxShadow:'var(--shadow-lg)',border:'1px solid var(--border-2)'},
  emoji: {fontSize:44,marginBottom:14},
  title: {fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,color:'var(--text-1)',marginBottom:8},
  desc:  {color:'var(--text-3)',fontSize:14,lineHeight:1.6},
};

// Desktop sidebar needs width
const sidebarStyle = { width:220, background:'var(--surface)', borderRight:'1px solid var(--border)', padding:'16px 12px', display:'flex', flexDirection:'column', gap:2, position:'sticky', top:58, height:'calc(100vh - 58px)', flexShrink:0, overflowY:'auto' };