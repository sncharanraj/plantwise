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
      {/* Hero Header */}
      <div style={s.hdr}>
        <div style={s.hbg}>
          {plant.image_url
            ? <img src={plant.image_url} alt={plant.plant_name} style={s.himg}/>
            : <div style={s.hph}><span style={{fontSize:80}}>🌿</span></div>
          }
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

      {/* Tabs */}
      <div style={s.tabs}>
        {[{k:TABS.CARE,l:'🌱 Care Guide'},{k:TABS.CHAT,l:'💬 Ask AI'},{k:TABS.JOURNAL,l:'📓 Journal'}].map(t=>(
          <button key={t.k} style={{...s.tab,...(tab===t.k?s.taba:{})}} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      <div style={s.content}>
        {tab===TABS.CARE   && <CareTab cg={plant.care_guide}/>}
        {tab===TABS.CHAT   && <ChatTab plant={plant} userId={user.id}/>}
        {tab===TABS.JOURNAL && <JournalTab plantId={plantId} userId={user.id}/>}
      </div>
      <Footer/>
    </div>
  );
}

/* ── COLLAPSIBLE SECTION ──────────────────────────────────────────── */
function CareSection({ icon, title, preview, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`care-section ${open ? 'open' : ''}`}>
      <div className="care-section-header" onClick={() => setOpen(o => !o)}>
        <div className="care-section-title">
          <div className="care-section-icon">{icon}</div>
          <div>
            {title}
            {!open && preview && <div className="care-section-preview">{preview}</div>}
          </div>
        </div>
        <span className="care-section-chevron">⌄</span>
      </div>
      {open && <div className="care-section-body">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="care-row">
      <span className="care-label">{label}</span>
      <span className="care-value">{String(value)}</span>
    </div>
  );
}

/* ── CARE TAB ─────────────────────────────────────────────────────── */
function CareTab({ cg }) {
  if (!cg) return (
    <div style={{textAlign:'center',padding:60}}>
      <div className="spinner" style={{width:32,height:32,margin:'0 auto 16px'}}/>
      <p style={{color:'var(--text-light)'}}>Generating care guide...</p>
    </div>
  );

  return (
    <div style={{padding:'20px 0'}}>

      {/* Overview */}
      {cg.overview && (
        <div className="overview-banner animate-fadeUp">
          <p style={{fontSize:15,lineHeight:1.7,color:'rgba(255,255,255,0.92)',fontFamily:'var(--font-display)',marginBottom:10}}>{cg.overview}</p>
          <div style={{display:'flex',gap:20,fontSize:13,color:'rgba(255,255,255,0.65)'}}>
            {cg.nativeRegion && <span>🌍 {cg.nativeRegion}</span>}
            {cg.lifespan && <span>⏱ {cg.lifespan}</span>}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="qs-grid animate-fadeUp">
        {[
          ['💧','Water', cg.watering?.frequency],
          ['☀️','Light', cg.sunlight?.requirement],
          ['🌡️','Temp',  cg.temperature?.ideal],
          ['💚','Humidity', cg.temperature?.humidity]
        ].map(([ic,lb,vl]) => (
          <div key={lb} className="qs-card">
            <span style={{fontSize:22,display:'block',marginBottom:6}}>{ic}</span>
            <p style={{fontSize:11,color:'var(--text-light)',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>{lb}</p>
            <p style={{fontSize:12,fontWeight:600,color:'var(--text-dark)',lineHeight:1.3}}>{vl||'See guide'}</p>
          </div>
        ))}
      </div>

      {/* Collapsible Sections */}
      {cg.soil && (
        <CareSection icon="🌍" title="Soil" preview={cg.soil.type} defaultOpen>
          <InfoRow label="Type" value={cg.soil.type}/>
          <InfoRow label="pH" value={cg.soil.ph}/>
          <InfoRow label="Mix" value={cg.soil.mix}/>
          {cg.soil.tips && <div className="care-tip">💡 {cg.soil.tips}</div>}
        </CareSection>
      )}
      {cg.watering && (
        <CareSection icon="💧" title="Watering" preview={cg.watering.frequency}>
          <InfoRow label="Frequency" value={cg.watering.frequency}/>
          <InfoRow label="Amount" value={cg.watering.amount}/>
          <InfoRow label="Method" value={cg.watering.method}/>
          {cg.watering.overdoSigns?.length > 0 && <InfoRow label="Overwatering signs" value={cg.watering.overdoSigns.join(', ')}/>}
          {cg.watering.underdoSigns?.length > 0 && <InfoRow label="Underwatering signs" value={cg.watering.underdoSigns.join(', ')}/>}
          {cg.watering.tips && <div className="care-tip">💡 {cg.watering.tips}</div>}
        </CareSection>
      )}
      {cg.sunlight && (
        <CareSection icon="☀️" title="Sunlight" preview={cg.sunlight.requirement}>
          <InfoRow label="Requirement" value={cg.sunlight.requirement}/>
          <InfoRow label="Hours per day" value={cg.sunlight.hoursPerDay}/>
          <InfoRow label="Indoor placement" value={cg.sunlight.indoorPlacement}/>
          {cg.sunlight.tips && <div className="care-tip">💡 {cg.sunlight.tips}</div>}
        </CareSection>
      )}
      {cg.temperature && (
        <CareSection icon="🌡️" title="Temperature & Humidity" preview={cg.temperature.ideal}>
          <InfoRow label="Ideal range" value={cg.temperature.ideal}/>
          <InfoRow label="Minimum" value={cg.temperature.minimum}/>
          <InfoRow label="Maximum" value={cg.temperature.maximum}/>
          <InfoRow label="Humidity" value={cg.temperature.humidity}/>
          <InfoRow label="Frost tolerant" value={cg.temperature.frostTolerant !== undefined ? (cg.temperature.frostTolerant ? 'Yes' : 'No') : null}/>
          {cg.temperature.tips && <div className="care-tip">💡 {cg.temperature.tips}</div>}
        </CareSection>
      )}
      {cg.fertilizer && (
        <CareSection icon="🌿" title="Fertilizer" preview={cg.fertilizer.frequency}>
          <InfoRow label="Type" value={cg.fertilizer.type}/>
          <InfoRow label="Frequency" value={cg.fertilizer.frequency}/>
          <InfoRow label="Season" value={cg.fertilizer.season}/>
          <InfoRow label="Organic option" value={cg.fertilizer.organic}/>
          {cg.fertilizer.tips && <div className="care-tip">💡 {cg.fertilizer.tips}</div>}
        </CareSection>
      )}
      {cg.potting && (
        <CareSection icon="🪴" title="Potting & Repotting" preview={cg.potting.repottingFrequency}>
          <InfoRow label="Pot size" value={cg.potting.potSize}/>
          <InfoRow label="Material" value={cg.potting.material}/>
          <InfoRow label="Repotting frequency" value={cg.potting.repottingFrequency}/>
          <InfoRow label="Signs to repot" value={cg.potting.repottingSign}/>
          {cg.potting.tips && <div className="care-tip">💡 {cg.potting.tips}</div>}
        </CareSection>
      )}
      {cg.pruning && (
        <CareSection icon="✂️" title="Pruning" preview={cg.pruning.frequency}>
          <InfoRow label="Needed" value={cg.pruning.needed ? 'Yes' : 'No'}/>
          <InfoRow label="Frequency" value={cg.pruning.frequency}/>
          <InfoRow label="Method" value={cg.pruning.method}/>
          {cg.pruning.tips && <div className="care-tip">💡 {cg.pruning.tips}</div>}
        </CareSection>
      )}
      {cg.commonProblems?.length > 0 && (
        <CareSection icon="🔍" title="Common Problems" preview={`${cg.commonProblems.length} known issues`}>
          {cg.commonProblems.map((p,i) => (
            <div key={i} style={{background:'rgba(224,92,75,0.06)',border:'1px solid rgba(224,92,75,0.12)',borderRadius:10,padding:'12px 14px',marginBottom:8}}>
              <p style={{fontWeight:600,fontSize:14,color:'var(--text-dark)',marginBottom:8}}>⚠️ {p.problem}</p>
              {['symptoms','cause','solution'].map(f => p[f] && (
                <div key={f} className="care-row"><span className="care-label">{f}</span><span className="care-value">{p[f]}</span></div>
              ))}
            </div>
          ))}
        </CareSection>
      )}
      {cg.pests?.length > 0 && (
        <CareSection icon="🐛" title="Pests" preview={cg.pests.map(p=>p.pest).join(', ')}>
          {cg.pests.map((p,i) => (
            <div key={i} style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'12px 14px',marginBottom:8}}>
              <p style={{fontWeight:600,fontSize:14,color:'var(--accent)',marginBottom:8}}>🐛 {p.pest}</p>
              <div className="care-row"><span className="care-label">Symptoms</span><span className="care-value">{p.symptoms}</span></div>
              <div className="care-row"><span className="care-label">Treatment</span><span className="care-value">{p.treatment}</span></div>
            </div>
          ))}
        </CareSection>
      )}
      {cg.growthTimeline?.length > 0 && (
        <CareSection icon="📅" title="Growth Timeline" preview={`${cg.growthTimeline.length} milestones`}>
          <div style={{paddingTop:8}}>
            {cg.growthTimeline.map((t,i) => (
              <div key={i} style={{display:'flex',gap:14,marginBottom:16,position:'relative'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:'var(--mint)',border:'2px solid var(--sage)',flexShrink:0}}/>
                  {i < cg.growthTimeline.length-1 && <div style={{width:2,flex:1,background:'var(--border)',marginTop:4}}/>}
                </div>
                <div style={{paddingBottom:8}}>
                  <p style={{fontWeight:600,fontSize:13,color:'var(--mint)',marginBottom:4}}>{t.period}</p>
                  <p style={{fontSize:14,color:'var(--text-mid)',lineHeight:1.5}}>{t.expectation}</p>
                </div>
              </div>
            ))}
          </div>
        </CareSection>
      )}
      {cg.propagation && (
        <CareSection icon="🌱" title="Propagation" preview={cg.propagation.bestMethod}>
          <InfoRow label="Best method" value={cg.propagation.bestMethod}/>
          <InfoRow label="Best season" value={cg.propagation.bestSeason}/>
          {cg.propagation.methods?.length > 0 && <InfoRow label="Methods" value={cg.propagation.methods.join(', ')}/>}
          {cg.propagation.steps?.length > 0 && (
            <div style={{marginTop:12}}>
              <p style={{fontSize:12,color:'var(--text-light)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Steps</p>
              {cg.propagation.steps.map((step,i) => (
                <p key={i} style={{fontSize:14,color:'var(--text-mid)',marginBottom:6,lineHeight:1.5}}>
                  <strong style={{color:'var(--mint)'}}>{i+1}.</strong> {step}
                </p>
              ))}
            </div>
          )}
        </CareSection>
      )}
      {cg.toxicity && (
        <CareSection icon="⚠️" title="Toxicity" preview={cg.toxicity.toxic ? '⚠️ Toxic' : '✅ Non-toxic'}>
          <InfoRow label="Toxic" value={cg.toxicity.toxic ? 'Yes ⚠️' : 'No ✅'}/>
          <InfoRow label="To humans" value={cg.toxicity.toHumans}/>
          <InfoRow label="To pets" value={cg.toxicity.toPets}/>
          {cg.toxicity.details && <div className="care-tip">💡 {cg.toxicity.details}</div>}
        </CareSection>
      )}
      {cg.companions?.length > 0 && (
        <CareSection icon="🤝" title="Companion Plants" preview={cg.companions.join(', ')}>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,paddingTop:4}}>
            {cg.companions.map((c,i) => (
              <span key={i} className="badge badge-green">{c}</span>
            ))}
          </div>
        </CareSection>
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
      {fetching
        ? <div style={{textAlign:'center',padding:40}}><div className="spinner" style={{width:28,height:28,margin:'0 auto'}}/></div>
        : <>
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
      }
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
    if (!note.trim()) return;
    setSaving(true);
    try {
      let ib=null, im=null;
      if (imageFile) { ib = await fileToBase64(imageFile); im = imageFile.type; }
      const r = await addJournalEntry({plantId,userId,note,imageBase64:ib,imageMimeType:im});
      setEntries(p => [r.data, ...p]);
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
          ? <div style={{textAlign:'center',padding:60,color:'var(--text-light)'}}><p style={{fontSize:40,marginBottom:12}}>📓</p><p>No entries yet. Start logging your plant journey!</p></div>
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
  page: {minHeight:'100vh',background:'var(--warm-white)',paddingBottom:40},
  hdr:  {position:'relative',height:280},
  hbg:  {position:'absolute',inset:0},
  himg: {width:'100%',height:'100%',objectFit:'cover'},
  hph:  {width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--forest),var(--moss))'},
  hov:  {position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.85),rgba(0,0,0,0.2) 60%,transparent)'},
  hcon: {position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'20px 24px'},
  back: {background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',color:'white',padding:'8px 16px',borderRadius:100,cursor:'pointer',fontSize:14,alignSelf:'flex-start'},
  pname:{fontFamily:'var(--font-display)',fontSize:32,fontWeight:600,color:'white',textShadow:'0 2px 12px rgba(0,0,0,0.4)'},
  sci:  {fontStyle:'italic',color:'rgba(255,255,255,0.75)',fontSize:15,marginBottom:10},
  badges:{display:'flex',gap:8,flexWrap:'wrap'},
  tabs: {display:'flex',background:'var(--panel-bg)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:50},
  tab:  {flex:1,padding:'14px 12px',background:'none',border:'none',cursor:'pointer',fontSize:14,fontWeight:500,color:'var(--text-light)',transition:'all 0.2s',borderBottom:'2px solid transparent',fontFamily:'var(--font-body)'},
  taba: {color:'var(--mint)',borderBottomColor:'var(--mint)',background:'rgba(82,183,136,0.06)'},
  content:{maxWidth:800,margin:'0 auto',padding:'0 16px'},
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
  sb:   {background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:100,padding:'8px 14px',fontSize:13,cursor:'pointer',color:'var(--text-mid)',transition:'all 0.2s'},
  ir:   {display:'flex',gap:10,padding:'14px 0 8px'},
};
