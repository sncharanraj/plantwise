import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPlant, getChatHistory, sendChatMessage, getJournal, addJournalEntry, deleteJournalEntry, fileToBase64 } from '../lib/api';
import Footer from '../components/Footer';

const TABS = { CARE:'care', CHAT:'chat', JOURNAL:'journal' };

export default function PlantDetail() {
  const { plantId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plant, setPlant] = useState(null);
  const [tab, setTab] = useState(TABS.CARE);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPlant(); }, [plantId]);

  async function fetchPlant() {
    try { const r = await getPlant(plantId); setPlant(r.data); }
    catch(e){} finally { setLoading(false); }
  }

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:20,background:'var(--warm-white)'}}>
      <span style={{fontSize:48}}>🌿</span>
      <div className="spinner" style={{width:36,height:36}}/>
    </div>
  );
  if(!plant) return <div style={{padding:40,textAlign:'center',color:'var(--text-dark)'}}>Plant not found</div>;

  const dc = {Beginner:'badge-green',Intermediate:'badge-amber',Expert:'badge-red'};

  return (
    <div style={s.page}>
      <div style={s.hdr}>
        <div style={s.hbg}>
          {plant.image_url
            ? <img src={plant.image_url} alt={plant.plant_name} style={s.himg}/>
            : <div style={s.hph}><span style={{fontSize:80}}>🌿</span></div>}
          <div style={s.hov}/>
        </div>
        <div style={s.hcon}>
          <button style={s.back} onClick={() => navigate('/')}>← Back</button>
          <div>
            <h1 style={s.pname}>{plant.plant_name}</h1>
            {plant.scientific_name && <p style={s.sci}>{plant.scientific_name}</p>}
            <div style={s.badges}>
              <span className="badge badge-green">{plant.days_growing} days growing</span>
              {plant.care_guide?.difficulty && <span className={`badge ${dc[plant.care_guide.difficulty]||'badge-green'}`}>{plant.care_guide.difficulty}</span>}
              {plant.care_guide?.type && <span className="badge badge-green">{plant.care_guide.type}</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={s.tabs}>
        {[{k:TABS.CARE,l:'🌱 Care Guide'},{k:TABS.CHAT,l:'💬 Ask AI'},{k:TABS.JOURNAL,l:'📓 Journal'}].map(t=>(
          <button key={t.k} style={{...s.tab,...(tab===t.k?s.taba:{})}} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      <div style={s.content}>
        {tab===TABS.CARE    && <CareTab cg={plant.care_guide}/>}
        {tab===TABS.CHAT    && <ChatTab plant={plant} userId={user.id}/>}
        {tab===TABS.JOURNAL && <JournalTab plantId={plantId} userId={user.id}/>}
      </div>
      <Footer/>
    </div>
  );
}

/* ── CARE TAB ─────────────────────────────────────────────────────── */
function CareTab({ cg }) {
  const scrollRef = useRef(null);

  const sections = cg ? [
    { key:'soil',        icon:'🌍', label:'Soil',           preview: cg.soil?.type,                data: cg.soil,        fields:[['Type','type'],['pH','ph'],['Mix','mix'],['Tips','tips']] },
    { key:'watering',    icon:'💧', label:'Watering',       preview: cg.watering?.frequency,        data: cg.watering,    fields:[['Frequency','frequency'],['Amount','amount'],['Method','method'],['Overwatering','overdoSigns'],['Underwatering','underdoSigns'],['Tips','tips']] },
    { key:'sunlight',    icon:'☀️', label:'Sunlight',       preview: cg.sunlight?.requirement,      data: cg.sunlight,    fields:[['Requirement','requirement'],['Hours/day','hoursPerDay'],['Indoor placement','indoorPlacement'],['Tips','tips']] },
    { key:'temperature', icon:'🌡️', label:'Temperature',    preview: cg.temperature?.ideal,         data: cg.temperature, fields:[['Ideal range','ideal'],['Minimum','minimum'],['Maximum','maximum'],['Humidity','humidity'],['Frost tolerant','frostTolerant'],['Tips','tips']] },
    { key:'fertilizer',  icon:'🌿', label:'Fertilizer',     preview: cg.fertilizer?.frequency,      data: cg.fertilizer,  fields:[['Type','type'],['Frequency','frequency'],['Season','season'],['Organic option','organic'],['Tips','tips']] },
    { key:'potting',     icon:'🪴', label:'Potting',        preview: cg.potting?.repottingFrequency, data: cg.potting,    fields:[['Pot size','potSize'],['Material','material'],['Repotting','repottingFrequency'],['Signs','repottingSign'],['Tips','tips']] },
    { key:'pruning',     icon:'✂️', label:'Pruning',        preview: cg.pruning?.frequency,         data: cg.pruning,     fields:[['Needed','needed'],['Frequency','frequency'],['Method','method'],['Tips','tips']] },
    { key:'problems',    icon:'🔍', label:'Problems',       preview: `${cg.commonProblems?.length||0} issues`, data: cg.commonProblems, isProblems: true },
    { key:'pests',       icon:'🐛', label:'Pests',          preview: cg.pests?.map(p=>p.pest).join(', '), data: cg.pests, isPests: true },
    { key:'timeline',    icon:'📅', label:'Timeline',       preview: `${cg.growthTimeline?.length||0} stages`, data: cg.growthTimeline, isTimeline: true },
    { key:'propagation', icon:'🌱', label:'Propagation',    preview: cg.propagation?.bestMethod,    data: cg.propagation, isPropagation: true },
    { key:'toxicity',    icon:'⚠️', label:'Toxicity',       preview: cg.toxicity?.toxic ? 'Toxic ⚠️' : 'Non-toxic ✅', data: cg.toxicity, fields:[['Toxic','toxic'],['To humans','toHumans'],['To pets','toPets'],['Details','details']] },
  ].filter(s => s.data && (Array.isArray(s.data) ? s.data.length > 0 : true)) : [];

  const [activeIdx, setActiveIdx] = useState(0);

  if (!cg) return (
    <div style={{textAlign:'center',padding:60}}>
      <div className="spinner" style={{width:32,height:32,margin:'0 auto 16px'}}/>
      <p style={{color:'var(--text-light)'}}>Generating care guide...</p>
    </div>
  );

  function scrollTabs(dir) {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 140, behavior: 'smooth' });
  }

  const active = sections[activeIdx];

  function renderDetail(sec) {
    if (!sec?.data) return null;

    if (sec.isProblems) return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {sec.data.map((p,i) => (
          <div key={i} style={det.prob}>
            <p style={{fontWeight:700,fontSize:14,color:'var(--danger)',marginBottom:8}}>⚠️ {p.problem}</p>
            {p.symptoms && <div style={det.row}><span style={det.lbl}>Symptoms</span><span style={det.val}>{p.symptoms}</span></div>}
            {p.cause    && <div style={det.row}><span style={det.lbl}>Cause</span><span style={det.val}>{p.cause}</span></div>}
            {p.solution && <div style={det.row}><span style={det.lbl}>Solution</span><span style={det.val}>{p.solution}</span></div>}
          </div>
        ))}
      </div>
    );

    if (sec.isPests) return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {sec.data.map((p,i) => (
          <div key={i} style={det.pest}>
            <p style={{fontWeight:700,fontSize:14,color:'var(--accent)',marginBottom:8}}>🐛 {p.pest}</p>
            {p.symptoms  && <div style={det.row}><span style={det.lbl}>Symptoms</span><span style={det.val}>{p.symptoms}</span></div>}
            {p.treatment && <div style={det.row}><span style={det.lbl}>Treatment</span><span style={det.val}>{p.treatment}</span></div>}
          </div>
        ))}
      </div>
    );

    if (sec.isTimeline) return (
      <div style={{display:'flex',flexDirection:'column',gap:0}}>
        {sec.data.map((t,i) => (
          <div key={i} style={{display:'flex',gap:14,marginBottom:18,position:'relative'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
              <div style={{width:12,height:12,borderRadius:'50%',background:'var(--mint)',border:'2px solid var(--sage)',flexShrink:0,marginTop:3}}/>
              {i < sec.data.length-1 && <div style={{width:2,flex:1,background:'var(--border)',marginTop:4,minHeight:20}}/>}
            </div>
            <div style={{paddingBottom:4}}>
              <p style={{fontWeight:700,fontSize:13,color:'var(--mint)',marginBottom:3}}>{t.period}</p>
              <p style={{fontSize:14,color:'var(--text-mid)',lineHeight:1.6}}>{t.expectation}</p>
            </div>
          </div>
        ))}
      </div>
    );

    if (sec.isPropagation) return (
      <div>
        {sec.data.bestMethod && <div style={det.row}><span style={det.lbl}>Best method</span><span style={det.val}>{sec.data.bestMethod}</span></div>}
        {sec.data.bestSeason && <div style={det.row}><span style={det.lbl}>Best season</span><span style={det.val}>{sec.data.bestSeason}</span></div>}
        {sec.data.methods?.length > 0 && <div style={det.row}><span style={det.lbl}>Methods</span><span style={det.val}>{sec.data.methods.join(', ')}</span></div>}
        {sec.data.steps?.length > 0 && (
          <div style={{marginTop:12}}>
            <p style={{fontSize:12,color:'var(--text-light)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Steps</p>
            {sec.data.steps.map((step,i) => (
              <p key={i} style={{fontSize:14,color:'var(--text-mid)',marginBottom:8,lineHeight:1.6}}>
                <strong style={{color:'var(--mint)'}}>{i+1}. </strong>{step}
              </p>
            ))}
          </div>
        )}
      </div>
    );

    // Default: field-based
    return (
      <div>
        {sec.fields?.map(([label, key]) => {
          let val = sec.data[key];
          if (val === undefined || val === null || val === '') return null;
          if (key === 'tips') return <div key={key} style={det.tip}>💡 {val}</div>;
          if (key === 'details') return <div key={key} style={det.tip}>💡 {val}</div>;
          if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
          if (Array.isArray(val)) val = val.join(', ');
          return (
            <div key={key} style={det.row}>
              <span style={det.lbl}>{label}</span>
              <span style={det.val}>{String(val)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{padding:'20px 0'}}>

      {/* Overview */}
      {cg.overview && (
        <div style={ov.banner} className="animate-fadeUp">
          <p style={ov.text}>{cg.overview}</p>
          <div style={ov.meta}>
            {cg.nativeRegion && <span>🌍 {cg.nativeRegion}</span>}
            {cg.lifespan     && <span>⏱ {cg.lifespan}</span>}
          </div>
        </div>
      )}

      {/* Horizontal scrollable feature tabs */}
      <div style={nav.wrap}>
        <button style={nav.arr} onClick={() => scrollTabs(-1)}>‹</button>
        <div ref={scrollRef} style={nav.scroll}>
          {sections.map((sec, i) => (
            <button
              key={sec.key}
              style={{...nav.chip, ...(activeIdx===i ? nav.chipActive : {})}}
              onClick={() => setActiveIdx(i)}
            >
              <span style={{fontSize:18}}>{sec.icon}</span>
              <span style={nav.chipLabel}>{sec.label}</span>
              {sec.preview && activeIdx !== i && (
                <span style={nav.chipSub}>{sec.preview}</span>
              )}
            </button>
          ))}
        </div>
        <button style={nav.arr} onClick={() => scrollTabs(1)}>›</button>
      </div>

      {/* Detail Panel */}
      {active && (
        <div key={active.key} style={det.panel} className="animate-fadeUp">
          <div style={det.hdr}>
            <div style={det.iconWrap}>{active.icon}</div>
            <div>
              <h3 style={det.title}>{active.label}</h3>
              {active.preview && <p style={det.sub}>{active.preview}</p>}
            </div>
          </div>
          <div style={{marginTop:16}}>
            {renderDetail(active)}
          </div>
        </div>
      )}

      {/* Companions */}
      {cg.companions?.length > 0 && (
        <div style={{...det.panel,marginTop:12}} className="animate-fadeUp">
          <div style={det.hdr}>
            <div style={det.iconWrap}>🤝</div>
            <h3 style={det.title}>Companion Plants</h3>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14}}>
            {cg.companions.map((c,i) => <span key={i} className="badge badge-green">{c}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CHAT TAB ─────────────────────────────────────────────────────── */
function ChatTab({ plant, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { fetchHistory(); }, [plant.id]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  async function fetchHistory() {
    try {
      const r = await getChatHistory(plant.id);
      if (r.data?.length) setMessages(r.data);
      else setMessages([{id:'w',role:'assistant',message:`Hi! 👋 I'm your ${plant.plant_name} care expert. You've been growing this plant for ${plant.days_growing} days! Ask me anything.`,created_at:new Date().toISOString()}]);
    } catch(e){} finally { setFetching(false); }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const um = {id:Date.now(),role:'user',message:input,created_at:new Date().toISOString()};
    setMessages(p => [...p, um]); setInput(''); setLoading(true);
    try {
      const r = await sendChatMessage(plant.id, input, userId);
      setMessages(p => [...p, {id:Date.now()+1,role:'assistant',message:r.response,created_at:new Date().toISOString()}]);
    } catch(e) {
      setMessages(p => [...p, {id:Date.now()+1,role:'assistant',message:'Sorry, I had trouble responding. Please try again.',created_at:new Date().toISOString()}]);
    } finally { setLoading(false); }
  }

  const sugg = ['Why are my leaves turning yellow?','When should I repot?','How much water does it need?','Is it getting enough light?'];

  return (
    <div style={ch.con}>
      {fetching ? <div style={{textAlign:'center',padding:40}}><div className="spinner" style={{width:28,height:28,margin:'0 auto'}}/></div> : (
        <>
          <div style={ch.msgs}>
            {messages.map(m => (
              <div key={m.id} style={{...ch.row,...(m.role==='user'?ch.rowu:{})}}>
                {m.role==='assistant' && <div style={ch.av}>🌿</div>}
                <div style={{...ch.bub,...(m.role==='user'?ch.bubu:ch.buba)}}>{m.message}</div>
              </div>
            ))}
            {loading && (
              <div style={ch.row}>
                <div style={ch.av}>🌿</div>
                <div style={{...ch.bub,...ch.buba,color:'var(--text-light)',fontStyle:'italic'}} className="animate-pulse">Thinking...</div>
              </div>
            )}
            <div ref={endRef}/>
          </div>
          {messages.length <= 1 && (
            <div style={ch.sugg}>
              {sugg.map((s,i) => <button key={i} style={ch.sb} onClick={() => setInput(s)}>{s}</button>)}
            </div>
          )}
          <div style={ch.ir}>
            <input className="input" placeholder={`Ask about your ${plant.plant_name}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} style={{flex:1}}/>
            <button className="btn btn-primary" onClick={send} disabled={loading||!input.trim()}>{loading?<span className="spinner"/>:'→'}</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── JOURNAL TAB ──────────────────────────────────────────────────── */
function JournalTab({ plantId, userId }) {
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEntries(); }, [plantId]);

  async function fetchEntries() {
    try { const r = await getJournal(plantId); setEntries(r.data||[]); }
    catch(e){} finally { setLoading(false); }
  }
  async function addEntry() {
    if (!note.trim()) return; setSaving(true);
    try {
      let ib=null, im=null;
      if (imageFile) { ib = await fileToBase64(imageFile); im = imageFile.type; }
      const r = await addJournalEntry({plantId,userId,note,imageBase64:ib,imageMimeType:im});
      setEntries(p => [r.data,...p]);
      setNote(''); setImageFile(null); setImagePreview(null);
    } catch(e){} finally { setSaving(false); }
  }
  async function delEntry(id) {
    await deleteJournalEntry(id);
    setEntries(p => p.filter(e => e.id !== id));
  }

  return (
    <div style={{padding:'20px 0'}}>
      <div className="card animate-fadeUp" style={{padding:'20px 24px',marginBottom:24}}>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,marginBottom:14,color:'var(--mint)'}}>📝 Log Today</h3>
        <textarea className="input" placeholder="What's happening with your plant today?" value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{resize:'vertical',marginBottom:12}}/>
        {imagePreview && <img src={imagePreview} alt="log" style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:10,marginBottom:12}}/>}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <label style={{fontSize:14,color:'var(--mint)',cursor:'pointer',fontWeight:500}}>📷 Add photo
            <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setImageFile(f);setImagePreview(URL.createObjectURL(f));}}}/>
          </label>
          <button className="btn btn-primary btn-sm" onClick={addEntry} disabled={saving||!note.trim()}>{saving?<span className="spinner"/>:'Save Entry'}</button>
        </div>
      </div>
      {loading
        ? <div style={{textAlign:'center',padding:40}}><div className="spinner" style={{width:28,height:28,margin:'0 auto'}}/></div>
        : entries.length===0
          ? <div style={{textAlign:'center',padding:60,color:'var(--text-light)'}}><p style={{fontSize:40,marginBottom:12}}>📓</p><p>No entries yet. Start logging!</p></div>
          : <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {entries.map(e => (
              <div key={e.id} style={{display:'flex',gap:14}} className="animate-fadeUp">
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,paddingTop:16}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:'var(--mint)',border:'2px solid var(--sage)'}}/>
                </div>
                <div style={{flex:1,background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:14,padding:'14px 18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:12,color:'var(--text-light)',fontWeight:500}}>{new Date(e.logged_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-light)',fontSize:14}} onClick={()=>delEntry(e.id)}>✕</button>
                  </div>
                  {e.image_url && <img src={e.image_url} alt="log" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:10,marginBottom:10}}/>}
                  <p style={{fontSize:14,color:'var(--text-dark)',lineHeight:1.6}}>{e.note}</p>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

/* ── STYLES ───────────────────────────────────────────────────────── */
const s = {
  page:  {minHeight:'100vh',background:'var(--warm-white)',paddingBottom:40},
  hdr:   {position:'relative',height:280},
  hbg:   {position:'absolute',inset:0},
  himg:  {width:'100%',height:'100%',objectFit:'cover'},
  hph:   {width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--forest),var(--moss))'},
  hov:   {position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.85),rgba(0,0,0,0.2) 60%,transparent)'},
  hcon:  {position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'20px 24px'},
  back:  {background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',color:'white',padding:'8px 16px',borderRadius:100,cursor:'pointer',fontSize:14,alignSelf:'flex-start'},
  pname: {fontFamily:'var(--font-display)',fontSize:32,fontWeight:600,color:'white',textShadow:'0 2px 12px rgba(0,0,0,0.4)'},
  sci:   {fontStyle:'italic',color:'rgba(255,255,255,0.75)',fontSize:15,marginBottom:10},
  badges:{display:'flex',gap:8,flexWrap:'wrap'},
  tabs:  {display:'flex',background:'var(--panel-bg)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:50},
  tab:   {flex:1,padding:'14px 12px',background:'none',border:'none',cursor:'pointer',fontSize:14,fontWeight:500,color:'var(--text-light)',transition:'all 0.2s',borderBottom:'2px solid transparent',fontFamily:'var(--font-body)'},
  taba:  {color:'var(--mint)',borderBottomColor:'var(--mint)',background:'rgba(82,183,136,0.06)'},
  content:{maxWidth:800,margin:'0 auto',padding:'0 16px'},
};

const ov = {
  banner: {background:'linear-gradient(135deg,#1a4a35,#0d2a1d)',border:'1px solid rgba(82,183,136,0.2)',borderRadius:16,padding:'20px 24px',marginBottom:20,position:'relative',overflow:'hidden'},
  text:   {fontSize:15,lineHeight:1.7,color:'rgba(255,255,255,0.88)',fontFamily:'var(--font-display)',marginBottom:10},
  meta:   {display:'flex',gap:20,fontSize:13,color:'rgba(255,255,255,0.55)'},
};

const nav = {
  wrap:      {display:'flex',alignItems:'center',gap:4,marginBottom:16,position:'relative'},
  arr:       {background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:10,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:20,color:'var(--mint)',flexShrink:0,fontWeight:700,transition:'all 0.2s'},
  scroll:    {display:'flex',gap:8,overflowX:'auto',flex:1,scrollbarWidth:'none',msOverflowStyle:'none',paddingBottom:2},
  chip:      {display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 14px',borderRadius:14,border:'1px solid var(--border)',background:'var(--card-bg)',cursor:'pointer',minWidth:80,flexShrink:0,transition:'all 0.2s',textAlign:'center'},
  chipActive:{border:'1px solid var(--mint)',background:'rgba(82,183,136,0.12)',boxShadow:'0 0 0 1px rgba(82,183,136,0.2)'},
  chipLabel: {fontSize:12,fontWeight:600,color:'var(--text-dark)',whiteSpace:'nowrap'},
  chipSub:   {fontSize:11,color:'var(--text-light)',whiteSpace:'nowrap',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'},
};

const det = {
  panel: {background:'var(--card-bg)',border:'1px solid var(--border-strong)',borderRadius:16,padding:'20px 22px',animation:'fadeUp 0.25s ease forwards'},
  hdr:   {display:'flex',alignItems:'center',gap:12},
  iconWrap:{width:40,height:40,borderRadius:12,background:'rgba(82,183,136,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0},
  title: {fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-dark)'},
  sub:   {fontSize:13,color:'var(--text-light)',marginTop:2},
  row:   {display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(82,183,136,0.06)',gap:16},
  lbl:   {fontSize:13,color:'var(--text-light)',flexShrink:0,textTransform:'capitalize'},
  val:   {fontSize:13,color:'var(--text-dark)',textAlign:'right',lineHeight:1.5},
  tip:   {background:'rgba(82,183,136,0.08)',border:'1px solid rgba(82,183,136,0.15)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'var(--text-mid)',marginTop:10,lineHeight:1.6},
  prob:  {background:'rgba(224,92,75,0.06)',border:'1px solid rgba(224,92,75,0.12)',borderRadius:10,padding:'12px 14px'},
  pest:  {background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'12px 14px'},
};

const ch = {
  con:  {display:'flex',flexDirection:'column',height:'calc(100vh - 340px)',minHeight:400},
  msgs: {flex:1,overflow:'auto',padding:'16px 0',display:'flex',flexDirection:'column',gap:14},
  row:  {display:'flex',gap:10,alignItems:'flex-start'},
  rowu: {flexDirection:'row-reverse'},
  av:   {width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--sage),var(--mint))',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16},
  bub:  {maxWidth:'75%',padding:'12px 16px',borderRadius:18,fontSize:15,lineHeight:1.6},
  buba: {background:'var(--card-bg)',border:'1px solid var(--border)',borderTopLeftRadius:4,color:'var(--text-dark)'},
  bubu: {background:'linear-gradient(135deg,var(--sage),var(--mint))',color:'var(--forest)',fontWeight:500,borderTopRightRadius:4},
  sugg: {display:'flex',gap:8,flexWrap:'wrap',padding:'10px 0'},
  sb:   {background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:100,padding:'8px 14px',fontSize:13,cursor:'pointer',color:'var(--text-mid)'},
  ir:   {display:'flex',gap:10,padding:'14px 0 8px'},
};
