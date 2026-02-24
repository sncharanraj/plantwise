import { useState } from 'react';
import { identifyByName, identifyByImage, addPlant, generateCareGuide, fileToBase64 } from '../lib/api';

const STEPS = { METHOD:'method', INPUT:'input', CONFIRM:'confirm', LOADING:'loading' };

export default function AddPlantModal({ userId, onClose, onPlantAdded }) {
  const [step, setStep] = useState(STEPS.METHOD);
  const [method, setMethod] = useState(null);
  const [plantName, setPlantName] = useState('');
  const [identified, setIdentified] = useState(null);
  const [selectedAlt, setSelectedAlt] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  function selectMethod(m) { setMethod(m); setStep(STEPS.INPUT); }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleIdentify() {
    setError(''); setLoading(true);
    try {
      let res;
      if (method === 'name') {
        if (!plantName.trim()) { setError('Please enter a plant name'); setLoading(false); return; }
        res = await identifyByName(plantName);
      } else {
        if (!imageFile) { setError('Please select an image'); setLoading(false); return; }
        const base64 = await fileToBase64(imageFile);
        res = await identifyByImage(base64, imageFile.type);
      }
      if (!res.data.identified) { setError('Could not identify this plant. Please try again.'); setLoading(false); return; }
      setIdentified(res.data);
      setSelectedAlt(null);
      setStep(STEPS.CONFIRM);
    } catch (err) { setError(err.message || 'Identification failed'); }
    finally { setLoading(false); }
  }

  async function handleConfirm() {
    const plant = selectedAlt || identified;
    setStep(STEPS.LOADING);
    try {
      setStatusMsg('Adding plant to your garden...');
      const newPlant = await addPlant({ userId, plantName: plant.commonName, scientificName: plant.scientificName, family: plant.family, identifiedVia: method });
      setStatusMsg('Generating AI care guide...');
      await generateCareGuide(plant.commonName, plant.scientificName, newPlant.data.id);
      onPlantAdded({ ...newPlant.data, plant_name: plant.commonName, days_growing: 0 });
    } catch (err) { setError(err.message); setStep(STEPS.CONFIRM); }
  }

  const confColor = (c) => c>=85?'rgba(39,174,96,0.15)':c>=65?'rgba(243,156,18,0.15)':'rgba(192,57,43,0.1)';

  return (
    <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={s.modal} className="animate-growIn">
        <div style={s.hdr}>
          <h2 style={s.ttl}>{step===STEPS.METHOD?'Add a Plant':step===STEPS.INPUT?'Identify Plant':step===STEPS.CONFIRM?'Confirm Plant':'Setting Up...'}</h2>
          {step!==STEPS.LOADING&&<button style={s.cls} onClick={onClose}>✕</button>}
        </div>
        <div style={s.prog}>{[STEPS.METHOD,STEPS.INPUT,STEPS.CONFIRM].map(s2=><div key={s2} style={{...s.dot,...(step===s2||step===STEPS.LOADING&&s2===STEPS.CONFIRM?s.dotA:{})}}/>)}</div>

        {step===STEPS.METHOD&&(
          <div style={s.body}>
            <p style={s.sub}>How would you like to identify your plant?</p>
            <div style={s.mgrid}>
              <button style={s.mc} onClick={()=>selectMethod('name')}><span style={s.mi}>🔤</span><h3 style={s.mt}>By Name</h3><p style={s.md}>Type the plant name</p></button>
              <button style={s.mc} onClick={()=>selectMethod('image')}><span style={s.mi}>📷</span><h3 style={s.mt}>By Photo</h3><p style={s.md}>Upload a plant photo</p></button>
            </div>
          </div>
        )}

        {step===STEPS.INPUT&&(
          <div style={s.body}>
            {error&&<div style={s.err}>{error}</div>}
            {method==='name'?(
              <>
                <p style={s.sub}>Enter the plant name as you know it</p>
                <input className="input" placeholder="e.g. Monstera, Tulsi, Money Plant..." value={plantName} onChange={e=>setPlantName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleIdentify()} autoFocus style={{marginBottom:20}}/>
              </>
            ):(
              <>
                <p style={s.sub}>Upload a clear photo of the plant</p>
                <div style={s.dz} onClick={()=>document.getElementById('pimg').click()}>
                  {imagePreview?<img src={imagePreview} alt="plant" style={s.prev}/>:<><span style={{fontSize:40}}>📸</span><p style={{color:'var(--text-mid)',marginTop:12}}>Click to select photo</p></>}
                  <input id="pimg" type="file" accept="image/*" style={{display:'none'}} onChange={handleImageSelect}/>
                </div>
              </>
            )}
            <div style={s.br}>
              <button className="btn btn-secondary" onClick={()=>{setStep(STEPS.METHOD);setError('');}}>← Back</button>
              <button className="btn btn-primary" onClick={handleIdentify} disabled={loading}>
                {loading?<><span className="spinner"/> Identifying...</>:'Identify Plant →'}
              </button>
            </div>
          </div>
        )}

        {step===STEPS.CONFIRM&&identified&&(
          <div style={s.body}>
            {error&&<div style={s.err}>{error}</div>}
            <p style={s.sub}>Is this the correct plant?</p>
            <div style={{...s.rc,...(selectedAlt===null?s.rcs:{})}} onClick={()=>setSelectedAlt(null)}>
              <div style={s.rl}>
                {selectedAlt===null&&<span style={s.ck}>✓</span>}
                <div><p style={s.rn}>{identified.commonName}</p><p style={s.rs}>{identified.scientificName}</p></div>
              </div>
              <span style={{...s.cb,background:confColor(identified.confidence)}}>{identified.confidence}%</span>
            </div>
            {identified.note&&<p style={s.note}>💬 {identified.note}</p>}
            {identified.alternatives?.length>0&&(
              <>{<p style={s.al}>Or did you mean?</p>}{identified.alternatives.map((alt,i)=>(
                <div key={i} style={{...s.rc,...s.ac,...(selectedAlt===alt?s.rcs:{})}} onClick={()=>setSelectedAlt(alt)}>
                  <div style={s.rl}>
                    {selectedAlt===alt&&<span style={s.ck}>✓</span>}
                    <div><p style={s.rn}>{alt.commonName}</p><p style={s.rs}>{alt.scientificName}</p></div>
                  </div>
                  {alt.confidence&&<span style={{...s.cb,background:confColor(alt.confidence)}}>{alt.confidence}%</span>}
                </div>
              ))}</>
            )}
            <div style={s.br}>
              <button className="btn btn-secondary" onClick={()=>{setStep(STEPS.INPUT);setError('');}}>← Try again</button>
              <button className="btn btn-primary" onClick={handleConfirm}>✓ Add to Garden</button>
            </div>
          </div>
        )}

        {step===STEPS.LOADING&&(
          <div style={s.lb}>
            <div style={{fontSize:64,marginBottom:24}}>🌱</div>
            <div className="animate-pulse" style={{fontFamily:'var(--font-display)',fontSize:20,color:'var(--forest)',marginBottom:20}}>{statusMsg}</div>
            <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden',maxWidth:300,margin:'0 auto 16px'}}>
              <div className="animate-pulse" style={{height:'100%',width:'70%',background:'linear-gradient(90deg,var(--sage),var(--mint))',borderRadius:2}}/>
            </div>
            <p style={{color:'var(--text-light)',fontSize:14}}>Generating complete care guide with Gemini AI...</p>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24},
  modal:{background:'white',borderRadius:24,width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.2)'},
  hdr:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 28px 0'},
  ttl:{fontFamily:'var(--font-display)',fontSize:24,fontWeight:600},
  cls:{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-light)',padding:4},
  prog:{display:'flex',gap:6,padding:'16px 28px 0'},
  dot:{height:4,flex:1,borderRadius:2,background:'var(--border)'},
  dotA:{background:'var(--sage)'},
  body:{padding:'20px 28px 28px'},
  sub:{color:'var(--text-mid)',marginBottom:20,fontSize:15},
  err:{background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.2)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'var(--danger)',fontSize:14},
  mgrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16},
  mc:{background:'var(--cream)',border:'2px solid var(--border)',borderRadius:16,padding:24,cursor:'pointer',textAlign:'center',transition:'all 0.2s'},
  mi:{fontSize:36,display:'block',marginBottom:12},
  mt:{fontFamily:'var(--font-display)',fontSize:18,marginBottom:8,color:'var(--text-dark)'},
  md:{fontSize:13,color:'var(--text-light)'},
  dz:{border:'2px dashed var(--mint)',borderRadius:16,padding:40,textAlign:'center',cursor:'pointer',marginBottom:20,background:'rgba(127,184,150,0.05)'},
  prev:{width:'100%',height:200,objectFit:'cover',borderRadius:14,display:'block'},
  br:{display:'flex',gap:12,justifyContent:'space-between',marginTop:24},
  rc:{border:'2px solid var(--border)',borderRadius:14,padding:'14px 18px',marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.2s'},
  rcs:{borderColor:'var(--sage)',background:'rgba(74,124,89,0.04)'},
  ac:{opacity:0.8},
  rl:{display:'flex',alignItems:'center',gap:12},
  ck:{width:22,height:22,borderRadius:'50%',background:'var(--sage)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0},
  rn:{fontWeight:600,fontSize:16,color:'var(--text-dark)'},
  rs:{fontSize:13,fontStyle:'italic',color:'var(--text-light)',marginTop:2},
  cb:{padding:'4px 10px',borderRadius:100,fontSize:13,fontWeight:600,color:'var(--text-mid)'},
  note:{fontSize:13,color:'var(--text-mid)',background:'var(--cream)',borderRadius:10,padding:'10px 14px',marginBottom:12},
  al:{fontSize:13,color:'var(--text-light)',marginBottom:8,fontWeight:500},
  lb:{padding:'40px 28px 48px',textAlign:'center'}
};
