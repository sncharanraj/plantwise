import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserPlants, getNotifications, markAllNotificationsRead, deletePlant, addJournalEntry } from '../lib/api';
import AddPlantModal from '../components/AddPlantModal';
import NotificationPanel from '../components/NotificationPanel';
import Footer from '../components/Footer';
import SettingsPanel from '../components/SettingsPanel';

const LANG_NAMES = { en:'EN', hi:'हि', kn:'ಕ' };

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { lang, switchLang, t, tn, translateNames, translatingNames } = useLanguage();
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [filterDiff, setFilterDiff] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [wateringId, setWateringId] = useState(null);

  useEffect(() => { if (user) { fetchPlants(); fetchNotifs(); } }, [user]);

  // Re-translate whenever language changes and plants are loaded
  useEffect(() => {
    if (plants.length > 0) {
      translateNames(plants.map(p => p.plant_name));
    }
  }, [lang, plants.length]);

  async function fetchPlants() {
    try {
      const r = await getUserPlants(user.id);
      const data = r.data || [];
      setPlants(data);
      // Translate immediately after loading
      if (data.length > 0) translateNames(data.map(p => p.plant_name));
    } catch(e) {} finally { setLoading(false); }
  }
  async function fetchNotifs() {
    try { const r = await getNotifications(user.id); setNotifications((r.data||[]).filter(n=>!n.read)); }
    catch(e){}
  }
  function onPlantAdded(p) {
    setPlants(prev => [p,...prev]);
    setShowAdd(false);
    navigate(`/plant/${p.id}`);
  }

  async function handleDelete(plantId) {
    try {
      await deletePlant(plantId);
      setPlants(prev => prev.filter(p => p.id !== plantId));
      setDeleteConfirm(null);
    } catch(e) { alert('Failed to delete plant'); }
  }

  async function handleWaterLog(e, plant) {
    e.stopPropagation();
    setWateringId(plant.id);
    try {
      await addJournalEntry({ plantId: plant.id, userId: user.id, note: `💧 Watered ${plant.plant_name}`, imageBase64: null, imageMimeType: null });
      setTimeout(() => setWateringId(null), 1500);
    } catch(e) { setWateringId(null); }
  }

  const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Expert'];
  const TYPES = ['All', 'Indoor', 'Outdoor'];
  const diffLabels = { All:t.all, Beginner:t.beginner, Intermediate:t.intermediate, Expert:t.expert };
  const typeLabels = { All:t.all, Indoor:t.indoor, Outdoor:t.outdoor };

  const filtered = plants.filter(p => {
    const displayName = tn(p.plant_name);
    const matchSearch = displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.plant_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.scientific_name||'').toLowerCase().includes(search.toLowerCase());
    const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff;
    const matchType = filterType === 'All' || (p.care_guide?.type||'').toLowerCase().includes(filterType.toLowerCase());
    return matchSearch && matchDiff && matchType;
  });

  const dc = { Beginner:'badge-green', Intermediate:'badge-amber', Expert:'badge-red' };
  const hasFilters = filterDiff !== 'All' || filterType !== 'All';

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.nl}><span style={s.nlo}>🌿</span><span style={s.nb}>PlantWise</span></div>
        <div style={s.nr}>
          {/* Language switcher */}
          <div style={s.langRow}>
            {Object.entries(LANG_NAMES).map(([code, label]) => (
              <button key={code} style={{...s.langBtn,...(lang===code?s.langBtnActive:{})}} onClick={() => switchLang(code)}>
                {label}
              </button>
            ))}
          </div>
          <button style={s.nb2} onClick={() => setShowNotifs(true)}>
            🔔{notifications.length > 0 && <span style={s.nbdg}>{notifications.length}</span>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>{t.signOut}</button>
        </div>
      </nav>

      <div style={s.content}>
        {/* Header */}
        <div style={s.hdr} className="animate-fadeUp">
          <div>
            <h1 style={s.ttl}>{t.myGarden}</h1>
            <p style={s.sub}>
              {plants.length === 0
                ? t.startByAdding
                : `${t.youreGrowing} ${plants.length} ${plants.length !== 1 ? t.plants : t.plant}`}
              {translatingNames && <span style={{fontSize:12,color:'var(--text-light)',marginLeft:8}}>🌐 {t.generating||'Translating...'}</span>}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t.addPlant}</button>
        </div>

        {/* Search + Filters */}
        {plants.length > 0 && (
          <div style={s.filterBar} className="animate-fadeUp">
            <input className="input" placeholder={t.searchPlants} value={search}
              onChange={e => setSearch(e.target.value)} style={{flex:1,minWidth:0}}/>
            <div style={s.filterChips}>
              <div style={s.filterGroup}>
                {DIFFICULTIES.map(d => (
                  <button key={d} style={{...s.chip,...(filterDiff===d?s.chipOn:{})}} onClick={() => setFilterDiff(d)}>
                    {diffLabels[d]}
                  </button>
                ))}
              </div>
              <div style={s.filterGroup}>
                {TYPES.map(tp => (
                  <button key={tp} style={{...s.chip,...(filterType===tp?s.chipOn:{})}} onClick={() => setFilterType(tp)}>
                    {typeLabels[tp]}
                  </button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button style={s.clearBtn} onClick={() => { setFilterDiff('All'); setFilterType('All'); }}>
                {t.clearFilters}
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={s.ls}>
            <div className="spinner spinner-dark" style={{width:32,height:32}}/>
            <p style={{color:'var(--text-light)',marginTop:16}}>{t.loadingGarden}</p>
          </div>
        ) : filtered.length === 0 && plants.length === 0 ? (
          <div style={s.es} className="animate-fadeUp">
            <div style={{fontSize:72,marginBottom:24}}>🌱</div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:28,marginBottom:12,color:'var(--text-dark)'}}>{t.gardenEmpty}</h2>
            <p style={{color:'var(--text-light)',maxWidth:360,lineHeight:1.6,marginBottom:32}}>{t.gardenEmptyDesc}</p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowAdd(true)}>{t.addFirstPlant}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.es} className="animate-fadeUp">
            <div style={{fontSize:48,marginBottom:16}}>🔍</div>
            <p style={{color:'var(--text-light)'}}>{t.noMatch}</p>
            <button style={{...s.clearBtn,marginTop:16}} onClick={() => { setSearch(''); setFilterDiff('All'); setFilterType('All'); }}>{t.clearAll}</button>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map((p, i) => (
              <div key={p.id} className="card animate-fadeUp"
                style={{...s.card, animationDelay:`${i*0.06}s`}}
                onClick={() => navigate(`/plant/${p.id}`)}>

                <div style={s.ci}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.plant_name} style={s.img}/>
                    : <div style={s.ph}><span style={{fontSize:48}}>🌿</span></div>}
                  <div style={s.ov}/>
                  {p.difficulty && (
                    <span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={s.db}>
                      {t[p.difficulty?.toLowerCase()] || p.difficulty}
                    </span>
                  )}
                  <div style={s.actions} className="card-actions">
                    <button style={{...s.actionBtn,...(wateringId===p.id?s.actionBtnSuccess:{})}} onClick={e => handleWaterLog(e,p)} title="Log watering">
                      {wateringId===p.id ? '✓' : '💧'}
                    </button>
                    <button style={{...s.actionBtn,...s.actionBtnDanger}} onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }} title="Delete plant">
                      🗑️
                    </button>
                  </div>
                </div>

                <div style={s.ci2}>
                  {/* Plant name — translated */}
                  <h3 style={s.pn}>{tn(p.plant_name)}</h3>
                  {p.scientific_name && <p style={s.sn}>{p.scientific_name}</p>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <p style={s.dg}>🗓 {p.days_growing} {t.daysGrowing}</p>
                    <button style={{...s.waterBtn,...(wateringId===p.id?s.waterBtnDone:{})}} onClick={e => handleWaterLog(e,p)}>
                      {wateringId===p.id ? t.watered : t.waterLog}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={s.bnav}>
        <button style={s.bb} onClick={() => navigate('/')}><span>🏡</span><span style={s.bl}>{t.garden}</span></button>
        <button style={{...s.bb,...s.ab}} onClick={() => setShowAdd(true)}><span style={s.ai}>+</span></button>
        <button style={s.bb} onClick={() => setShowSettings(true)}><span>⚙️</span><span style={s.bl}>{t.settings}</span></button>
      </div>

      <Footer/>

      {/* Delete Modal */}
      {deleteConfirm && (
        <>
          <div style={m.backdrop} onClick={() => setDeleteConfirm(null)}/>
          <div style={m.modal} className="animate-growIn">
            <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:20,marginBottom:8,color:'var(--text-dark)'}}>{t.deletePlant}</h3>
            <p style={{color:'var(--text-light)',fontSize:14,marginBottom:24,lineHeight:1.6}}>{t.deleteDesc}</p>
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-secondary" style={{flex:1}} onClick={() => setDeleteConfirm(null)}>{t.cancel}</button>
              <button style={{...m.delBtn,flex:1}} onClick={() => handleDelete(deleteConfirm)}>{t.delete}</button>
            </div>
          </div>
        </>
      )}

      {showAdd      && <AddPlantModal userId={user.id} onClose={() => setShowAdd(false)} onPlantAdded={onPlantAdded}/>}
      {showNotifs   && <NotificationPanel notifications={notifications} userId={user.id} onClose={() => setShowNotifs(false)} onMarkAllRead={() => { markAllNotificationsRead(user.id); setNotifications([]); }}/>}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)}/>}
    </div>
  );
}

const s = {
  page:   {minHeight:'100vh',background:'var(--warm-white)',paddingBottom:90},
  nav:    {position:'sticky',top:0,zIndex:100,background:'rgba(18,26,18,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'0 24px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'},
  nl:     {display:'flex',alignItems:'center',gap:10},
  nlo:    {fontSize:24},
  nb:     {fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--mint)'},
  nr:     {display:'flex',alignItems:'center',gap:12},
  nb2:    {background:'none',border:'none',cursor:'pointer',fontSize:20,position:'relative',padding:4},
  nbdg:   {position:'absolute',top:0,right:0,background:'#e74c3c',color:'white',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  langRow:{display:'flex',gap:4},
  langBtn:{padding:'4px 10px',borderRadius:100,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:13,color:'var(--text-mid)',transition:'all 0.2s'},
  langBtnActive:{background:'var(--sage)',color:'white',border:'1px solid var(--sage)',fontWeight:600},
  content:{maxWidth:1200,margin:'0 auto',padding:'32px 24px'},
  hdr:    {display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:16},
  ttl:    {fontSize:36,fontWeight:600,color:'var(--text-dark)',lineHeight:1.2,fontFamily:'var(--font-display)'},
  sub:    {color:'var(--text-light)',fontSize:15,marginTop:4},
  filterBar:   {display:'flex',flexDirection:'column',gap:12,marginBottom:24},
  filterChips: {display:'flex',gap:10,flexWrap:'wrap'},
  filterGroup: {display:'flex',gap:6},
  chip:        {padding:'6px 14px',borderRadius:100,border:'1px solid var(--border)',background:'var(--card-bg)',color:'var(--text-light)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.15s'},
  chipOn:      {background:'rgba(82,183,136,0.15)',border:'1px solid var(--mint)',color:'var(--mint)'},
  clearBtn:    {background:'none',border:'none',color:'var(--text-light)',fontSize:13,cursor:'pointer',alignSelf:'flex-start'},
  grid:   {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:20},
  card:   {overflow:'hidden',transition:'all 0.25s ease',cursor:'pointer'},
  ci:     {position:'relative',height:180,overflow:'hidden',background:'linear-gradient(135deg,#1a3320,#0d2010)'},
  img:    {width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.3s ease'},
  ph:     {width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'},
  ov:     {position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.35),transparent)'},
  db:     {position:'absolute',top:12,right:12},
  actions:{position:'absolute',top:10,left:10,display:'flex',gap:6,opacity:0,transition:'opacity 0.2s'},
  actionBtn:{width:34,height:34,borderRadius:10,border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',transition:'all 0.2s'},
  actionBtnSuccess:{background:'rgba(82,183,136,0.7)'},
  actionBtnDanger: {background:'rgba(224,92,75,0.6)'},
  ci2:    {padding:'14px 18px'},
  pn:     {fontFamily:'var(--font-display)',fontSize:19,fontWeight:600,marginBottom:3,color:'var(--text-dark)'},
  sn:     {fontSize:13,fontStyle:'italic',color:'var(--text-light)',marginBottom:8},
  dg:     {fontSize:13,color:'var(--text-mid)'},
  waterBtn:     {fontSize:12,fontWeight:600,padding:'5px 12px',borderRadius:100,border:'1px solid var(--border)',background:'var(--card-bg)',color:'var(--mint)',cursor:'pointer',transition:'all 0.2s',whiteSpace:'nowrap'},
  waterBtnDone: {background:'rgba(82,183,136,0.15)',borderColor:'var(--mint)',color:'var(--mint)'},
  ls:     {display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80},
  es:     {display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'80px 24px'},
  bnav:   {position:'fixed',bottom:0,left:0,right:0,background:'rgba(15,24,15,0.95)',backdropFilter:'blur(12px)',borderTop:'1px solid var(--border)',padding:'8px 24px 16px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  bb:     {display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:22,padding:'8px 20px',borderRadius:12},
  bl:     {fontSize:11,color:'var(--text-light)'},
  ab:     {background:'linear-gradient(135deg,var(--sage),var(--mint))',borderRadius:'50%',width:52,height:52,padding:0},
  ai:     {fontSize:28,color:'var(--forest)',fontWeight:700,lineHeight:1},
};
const m = {
  backdrop:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:200},
  modal:   {position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:20,padding:'32px 28px',zIndex:201,width:'min(90vw,380px)',textAlign:'center',boxShadow:'0 24px 64px rgba(0,0,0,0.5)'},
  delBtn:  {padding:'12px 24px',borderRadius:100,border:'none',background:'var(--danger)',color:'white',fontSize:15,fontWeight:600,cursor:'pointer'},
};