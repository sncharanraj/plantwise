import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPlant, getChatHistory, sendChatMessage, getJournal, addJournalEntry, deleteJournalEntry, fileToBase64 } from '../lib/api';

const TABS = { CARE:'care', CHAT:'chat', JOURNAL:'journal' };

export default function PlantDetail() {
  const { plantId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plant, setPlant] = useState(null);
  const [tab, setTab] = useState(TABS.CARE);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ fetchPlant(); },[plantId]);

  async function fetchPlant() {
    try { const r = await getPlant(plantId); setPlant(r.data); }
    catch(e){} finally { setLoading(false); }
  }

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:20}}><span style={{fontSize:48}}>🌿</span><div className="spinner spinner-dark" style={{width:36,height:36}}/></div>;
  if(!plant) return <div style={{padding:40,textAlign:'center'}}>Plant not found</div>;

  const dc = {Beginner:'badge-green',Intermediate:'badge-amber',Expert:'badge-red'};

  return (
    <div style={s.page}>
      <div style={s.hdr}>
        <div style={s.hbg}>
          {plant.image_url?<img src={plant.image_url} alt={plant.plant_name} style={s.himg}/>:<div style={s.hph}><span style={{fontSize:80}}>🌿</span></div>}
          <div style={s.hov}/>
        </div>
        <div style={s.hcon}>
          <button style={s.back} onClick={()=>navigate('/')}>← Back</button>
          <div>
            <h1 style={s.pname}>{plant.plant_name}</h1>
            {plant.scientific_name&&<p style={s.sci}>{plant.scientific_name}</p>}
            <div style={s.badges}>
              <span className="badge badge-green">{plant.days_growing} days growing</span>
              {plant.care_guide?.difficulty&&<span className={`badge ${dc[plant.care_guide.difficulty]||'badge-green'}`}>{plant.care_guide.difficulty}</span>}
              {plant.care_guide?.type&&<span className="badge badge-green">{plant.care_guide.type}</span>}
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
        {tab===TABS.CARE&&<CareTab cg={plant.care_guide}/>}
        {tab===TABS.CHAT&&<ChatTab plant={plant} userId={user.id}/>}
        {tab===TABS.JOURNAL&&<JournalTab plantId={plantId} userId={user.id}/>}
      </div>
    </div>
  );
}

function CareTab({cg}) {
  if(!cg) return <div style={{textAlign:'center',padding:60}}><div className="spinner spinner-dark" style={{width:32,height:32,margin:'0 auto 16px'}}/><p style={{color:'var(--text-light)'}}>Generating care guide...</p></div>;
  return (
    <div style={{padding:'24px 0'}}>
      {cg.overview&&<div style={c.ov}><p style={c.ovt}>{cg.overview}</p><div style={c.ovm}>{cg.nativeRegion&&<span>🌍 {cg.nativeRegion}</span>}{cg.lifespan&&<span>⏱ {cg.lifespan}</span>}</div></div>}
      <div style={c.qs}>
        {[['💧','Water',cg.watering?.frequency],['☀️','Light',cg.sunlight?.requirement],['🌡️','Temp',cg.temperature?.ideal],['💚','Humidity',cg.temperature?.humidity]].map(([ic,lb,vl])=>(
          <div key={lb} style={c.qs2}><span style={{fontSize:24,display:'block',marginBottom:6}}>{ic}</span><p style={c.qsl}>{lb}</p><p style={c.qsv}>{vl||'See guide'}</p></div>
        ))}
      </div>
      {[
        ['🌍 Soil', cg.soil, ['type','ph','mix','tips']],
        ['💧 Watering', cg.watering, ['frequency','amount','method','tips']],
        ['☀️ Sunlight', cg.sunlight, ['requirement','hoursPerDay','indoorPlacement','tips']],
        ['🌡️ Temperature', cg.temperature, ['ideal','minimum','maximum','humidity','tips']],
        ['🌿 Fertilizer', cg.fertilizer, ['type','frequency','season','organic','tips']],
        ['🪴 Potting', cg.potting, ['potSize','material','repottingFrequency','repottingSign','tips']],
      ].map(([title,data,fields])=>data&&(
        <div key={title} style={c.sec} className="animate-fadeUp">
          <h3 style={c.st}>{title}</h3>
          {fields.map(f=>data[f]&&f!=='tips'?<div key={f} style={c.ir}><span style={c.il}>{f}</span><span style={c.iv}>{String(data[f])}</span></div>:null)}
          {data.tips&&<div style={c.tip}>💡 {data.tips}</div>}
        </div>
      ))}
      {cg.commonProblems?.length>0&&(
        <div style={c.sec} className="animate-fadeUp">
          <h3 style={c.st}>🔍 Common Problems</h3>
          {cg.commonProblems.map((p,i)=>(
            <div key={i} style={c.pc}>
              <p style={{fontWeight:600,fontSize:15,marginBottom:8}}>⚠️ {p.problem}</p>
              {['symptoms','cause','solution'].map(f=>p[f]&&<div key={f} style={c.ir}><span style={c.il}>{f}</span><span style={c.iv}>{p[f]}</span></div>)}
            </div>
          ))}
        </div>
      )}
      {cg.growthTimeline?.length>0&&(
        <div style={c.sec} className="animate-fadeUp">
          <h3 style={c.st}>📅 Growth Timeline</h3>
          {cg.growthTimeline.map((t,i)=>(
            <div key={i} style={{display:'flex',gap:16,marginBottom:16}}>
              <div style={{width:12,height:12,borderRadius:'50%',background:'var(--sage)',flexShrink:0,marginTop:4}}/>
              <div><p style={{fontWeight:600,fontSize:14,color:'var(--forest)',marginBottom:4}}>{t.period}</p><p style={{fontSize:14,color:'var(--text-mid)',lineHeight:1.5}}>{t.expectation}</p></div>
            </div>
          ))}
        </div>
      )}
      {cg.propagation&&(
        <div style={c.sec} className="animate-fadeUp">
          <h3 style={c.st}>🌱 Propagation</h3>
          {['bestMethod','bestSeason'].map(f=>cg.propagation[f]&&<div key={f} style={c.ir}><span style={c.il}>{f}</span><span style={c.iv}>{cg.propagation[f]}</span></div>)}
          {cg.propagation.steps?.length>0&&<div style={{marginTop:12}}>{cg.propagation.steps.map((s,i)=><p key={i} style={{fontSize:14,color:'var(--text-mid)',marginBottom:6,lineHeight:1.5}}><strong>{i+1}.</strong> {s}</p>)}</div>}
        </div>
      )}
      {cg.toxicity&&(
        <div style={c.sec} className="animate-fadeUp">
          <h3 style={c.st}>⚠️ Toxicity</h3>
          {['toHumans','toPets'].map(f=>cg.toxicity[f]&&<div key={f} style={c.ir}><span style={c.il}>{f}</span><span style={c.iv}>{cg.toxicity[f]}</span></div>)}
          {cg.toxicity.details&&<div style={c.tip}>💡 {cg.toxicity.details}</div>}
        </div>
      )}
    </div>
  );
}

function ChatTab({plant,userId}) {
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [fetching,setFetching]=useState(true);
  const endRef=useRef(null);

  useEffect(()=>{fetchHistory();},[plant.id]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  async function fetchHistory() {
    try {
      const r=await getChatHistory(plant.id);
      if(r.data?.length) setMessages(r.data);
      else setMessages([{id:'w',role:'assistant',message:`Hi! 👋 I am your ${plant.plant_name} care expert. You have been growing this plant for ${plant.days_growing} days! Ask me anything.`,created_at:new Date().toISOString()}]);
    } catch(e){} finally{setFetching(false);}
  }

  async function send() {
    if(!input.trim()||loading) return;
    const um={id:Date.now(),role:'user',message:input,created_at:new Date().toISOString()};
    setMessages(p=>[...p,um]); setInput(''); setLoading(true);
    try {
      const r=await sendChatMessage(plant.id,input,userId);
      setMessages(p=>[...p,{id:Date.now()+1,role:'assistant',message:r.response,created_at:new Date().toISOString()}]);
    } catch(e){
      setMessages(p=>[...p,{id:Date.now()+1,role:'assistant',message:'Sorry, I had trouble responding. Please try again.',created_at:new Date().toISOString()}]);
    } finally{setLoading(false);}
  }

  const sugg=['Why are my leaves turning yellow?','When should I repot?','How much water does it need?','Is it getting enough light?'];

  return (
    <div style={ch.con}>
      {fetching?<div style={{textAlign:'center',padding:40}}><div className="spinner spinner-dark" style={{width:28,height:28,margin:'0 auto'}}/></div>:(
        <>
          <div style={ch.msgs}>
            {messages.map(m=>(
              <div key={m.id} style={{...ch.row,...(m.role==='user'?ch.rowu:{})}}>
                {m.role==='assistant'&&<div style={ch.av}>🌿</div>}
                <div style={{...ch.bub,...(m.role==='user'?ch.bubu:ch.buba)}}>{m.message}</div>
              </div>
            ))}
            {loading&&<div style={ch.row}><div style={ch.av}>🌿</div><div style={{...ch.bub,...ch.buba,...{color:'var(--text-light)',fontStyle:'italic'}}} className="animate-pulse">Thinking...</div></div>}
            <div ref={endRef}/>
          </div>
          {messages.length<=1&&<div style={ch.sugg}>{sugg.map((s,i)=><button key={i} style={ch.sb} onClick={()=>setInput(s)}>{s}</button>)}</div>}
          <div style={ch.ir}>
            <input className="input" placeholder={`Ask about your ${plant.plant_name}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} style={{flex:1}}/>
            <button className="btn btn-primary" onClick={send} disabled={loading||!input.trim()}>{loading?<span className="spinner"/>:'→'}</button>
          </div>
        </>
      )}
    </div>
  );
}

function JournalTab({plantId,userId}) {
  const [entries,setEntries]=useState([]);
  const [note,setNote]=useState('');
  const [imageFile,setImageFile]=useState(null);
  const [imagePreview,setImagePreview]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{fetchEntries();},[plantId]);

  async function fetchEntries(){
    try{const r=await getJournal(plantId);setEntries(r.data||[]);}catch(e){}finally{setLoading(false);}
  }
  async function addEntry(){
    if(!note.trim()) return;
    setSaving(true);
    try{
      let ib=null,im=null;
      if(imageFile){ib=await fileToBase64(imageFile);im=imageFile.type;}
      const r=await addJournalEntry({plantId,userId,note,imageBase64:ib,imageMimeType:im});
      setEntries(p=>[r.data,...p]);
      setNote('');setImageFile(null);setImagePreview(null);
    }catch(e){}finally{setSaving(false);}
  }
  async function delEntry(id){
    await deleteJournalEntry(id);
    setEntries(p=>p.filter(e=>e.id!==id));
  }

  return (
    <div style={{padding:'24px 0'}}>
      <div style={j.ac} className="card animate-fadeUp">
        <h3 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,marginBottom:14,color:'var(--forest)'}}>📝 Log Today</h3>
        <textarea className="input" placeholder="What is happening with your plant today? e.g. Added fertilizer, New leaf spotted..." value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{resize:'vertical',marginBottom:12}}/>
        {imagePreview&&<img src={imagePreview} alt="log" style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:10,marginBottom:12}}/>}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <label style={{fontSize:14,color:'var(--sage)',cursor:'pointer',fontWeight:500}}>📷 Add photo
            <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setImageFile(f);setImagePreview(URL.createObjectURL(f));}}}/>
          </label>
          <button className="btn btn-primary btn-sm" onClick={addEntry} disabled={saving||!note.trim()}>{saving?<span className="spinner"/>:'Save Entry'}</button>
        </div>
      </div>
      {loading?<div style={{textAlign:'center',padding:40}}><div className="spinner spinner-dark" style={{width:28,height:28,margin:'0 auto'}}/></div>
      :entries.length===0?<div style={{textAlign:'center',padding:60,color:'var(--text-light)'}}><p style={{fontSize:40,marginBottom:12}}>📓</p><p>No entries yet. Start logging your plant journey!</p></div>
      :<div style={{display:'flex',flexDirection:'column',gap:16}}>
        {entries.map(e=>(
          <div key={e.id} style={{display:'flex',gap:16}} className="animate-fadeUp">
            <div style={{width:12,height:12,borderRadius:'50%',background:'var(--mint)',flexShrink:0,marginTop:16}}/>
            <div style={j.ec}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontSize:13,color:'var(--text-light)',fontWeight:500}}>{new Date(e.logged_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-light)',fontSize:14}} onClick={()=>delEntry(e.id)}>✕</button>
              </div>
              {e.image_url&&<img src={e.image_url} alt="log" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:10,marginBottom:10}}/>}
              <p style={{fontSize:15,color:'var(--text-dark)',lineHeight:1.6}}>{e.note}</p>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

const s = {
  page:{minHeight:'100vh',background:'var(--warm-white)',paddingBottom:40},
  hdr:{position:'relative',height:280},
  hbg:{position:'absolute',inset:0},
  himg:{width:'100%',height:'100%',objectFit:'cover'},
  hph:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--forest),var(--moss))'},
  hov:{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7),rgba(0,0,0,0.1) 60%,transparent)'},
  hcon:{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'20px 24px'},
  back:{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',border:'none',color:'white',padding:'8px 16px',borderRadius:100,cursor:'pointer',fontSize:14,alignSelf:'flex-start'},
  pname:{fontFamily:'var(--font-display)',fontSize:32,fontWeight:600,color:'white',textShadow:'0 2px 8px rgba(0,0,0,0.3)'},
  sci:{fontStyle:'italic',color:'rgba(255,255,255,0.8)',fontSize:15,marginBottom:10},
  badges:{display:'flex',gap:8,flexWrap:'wrap'},
  tabs:{display:'flex',background:'white',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:50},
  tab:{flex:1,padding:'14px 12px',background:'none',border:'none',cursor:'pointer',fontSize:14,fontWeight:500,color:'var(--text-light)',transition:'all 0.2s',borderBottom:'2px solid transparent',fontFamily:'var(--font-body)'},
  taba:{color:'var(--forest)',borderBottomColor:'var(--sage)'},
  content:{maxWidth:800,margin:'0 auto',padding:'0 16px'}
};
const c = {
  ov:{background:'linear-gradient(135deg,var(--forest),var(--moss))',borderRadius:16,padding:'20px 24px',marginBottom:24,color:'white'},
  ovt:{fontSize:16,lineHeight:1.7,marginBottom:12,fontFamily:'var(--font-display)'},
  ovm:{display:'flex',gap:20,fontSize:13,opacity:0.8},
  qs:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24},
  qs2:{background:'white',border:'1px solid var(--border)',borderRadius:14,padding:'16px 12px',textAlign:'center'},
  qsl:{fontSize:11,color:'var(--text-light)',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5},
  qsv:{fontSize:12,fontWeight:600,color:'var(--text-dark)',lineHeight:1.3},
  sec:{background:'white',border:'1px solid var(--border)',borderRadius:16,padding:'20px 24px',marginBottom:16},
  st:{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,marginBottom:16,color:'var(--forest)',paddingBottom:12,borderBottom:'1px solid var(--border)'},
  ir:{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',gap:16},
  il:{fontSize:14,color:'var(--text-light)',flexShrink:0,textTransform:'capitalize'},
  iv:{fontSize:14,color:'var(--text-dark)',textAlign:'right'},
  tip:{background:'rgba(127,184,150,0.08)',border:'1px solid rgba(127,184,150,0.2)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'var(--text-mid)',marginTop:12,lineHeight:1.6},
  pc:{background:'var(--cream)',borderRadius:12,padding:'14px 16px',marginBottom:12}
};
const ch = {
  con:{display:'flex',flexDirection:'column',height:'calc(100vh - 340px)',minHeight:400},
  msgs:{flex:1,overflow:'auto',padding:'20px 0',display:'flex',flexDirection:'column',gap:16},
  row:{display:'flex',gap:10,alignItems:'flex-start'},
  rowu:{flexDirection:'row-reverse'},
  av:{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--forest),var(--sage))',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16},
  bub:{maxWidth:'75%',padding:'12px 16px',borderRadius:18,fontSize:15,lineHeight:1.6},
  buba:{background:'white',border:'1px solid var(--border)',borderTopLeftRadius:4,color:'var(--text-dark)'},
  bubu:{background:'var(--forest)',color:'white',borderTopRightRadius:4},
  sugg:{display:'flex',gap:8,flexWrap:'wrap',padding:'12px 0'},
  sb:{background:'var(--cream)',border:'1px solid var(--border)',borderRadius:100,padding:'8px 14px',fontSize:13,cursor:'pointer',color:'var(--text-mid)'},
  ir:{display:'flex',gap:10,padding:'16px 0 8px'}
};
const j = {
  ac:{padding:'20px 24px',marginBottom:24},
  ec:{flex:1,background:'white',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px'}
};
