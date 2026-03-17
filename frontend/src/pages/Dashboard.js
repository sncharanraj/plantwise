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

/* ── Plant Logo — clean sprout icon ── */
function PlantLogo({ size=28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pot */}
      <rect x="10" y="23" width="12" height="7" rx="2" fill="var(--green-mid)" opacity="0.85"/>
      <rect x="9" y="21" width="14" height="3" rx="1.5" fill="var(--green)" opacity="0.95"/>
      {/* Stem */}
      <path d="M16 21 L16 13" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Left leaf */}
      <path d="M16 17 C16 17 10 15 9 10 C9 10 14 9 16 14" fill="var(--green-mid)" opacity="0.9"/>
      {/* Right leaf */}
      <path d="M16 14 C16 14 22 12 23 7 C23 7 18 6 16 11" fill="var(--green)" opacity="0.95"/>
      {/* Top bud */}
      <circle cx="16" cy="12" r="2.5" fill="var(--amber)" opacity="0.9"/>
      <circle cx="16" cy="12" r="1.2" fill="var(--amber-lite)" opacity="0.85"/>
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

  // Quote of the day — show once per day
  const [showQuote, setShowQuote] = useState(()=>{
    const today = new Date().toDateString();
    const seen  = localStorage.getItem('pw_quote_seen');
    return seen !== today; // true = show popup
  });
  function closeQuote(){
    localStorage.setItem('pw_quote_seen', new Date().toDateString());
    setShowQuote(false);
  }

  useEffect(()=>{ if(user){fetchPlants();fetchNotifs();} },[user]);
  useEffect(()=>{ if(plants.length>0) translateNames(plants.map(p=>p.plant_name)); },[lang,plants.length,translateNames]);

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
          <PlantLogo size={28}/>
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
            <span style={sd.addIcon}>🌱</span>
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
            ? <HomeView user={user} plants={plants} loading={loading} t={t} tn={tn} dc={dc} lang={lang}
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
      {showQuote&&<QuoteOfDay lang={lang} onClose={closeQuote}/>}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   QUOTE OF THE DAY
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const QUOTES = {
  en: [
    { q: "Do small things with great love.", a: "Mother Teresa" },
    { q: "Be kind, for everyone you meet is fighting a hard battle.", a: "Plato" },
    { q: "In a world where you can be anything, be kind.", a: "Unknown" },
    { q: "Love and kindness are never wasted.", a: "Barbara De Angelis" },
    { q: "No act of kindness, no matter how small, is ever wasted.", a: "Aesop" },
    { q: "We rise by lifting others.", a: "Robert Ingersoll" },
    { q: "The best way to find yourself is to lose yourself in the service of others.", a: "Gandhi" },
    { q: "A single act of kindness throws out roots in all directions.", a: "Amelia Earhart" },
    { q: "Spread love everywhere you go.", a: "Mother Teresa" },
    { q: "You cannot do a kindness too soon, for you never know how soon it will be too late.", a: "Emerson" },
    { q: "Life is short. Be kind. Be grateful. Be present.", a: "Unknown" },
    { q: "The greatest gift you can give someone is your time, attention, and love.", a: "Unknown" },
    { q: "Love is not something you find. Love is something that finds you.", a: "Loretta Young" },
    { q: "Carry out a random act of kindness with no expectation of reward.", a: "Princess Diana" },
    { q: "Keep your face always toward the sunshine, and shadows will fall behind you.", a: "Walt Whitman" },
    { q: "What we have once enjoyed, we can never lose.", a: "Helen Keller" },
    { q: "The purpose of life is to contribute in some way to making things better.", a: "Robert F. Kennedy" },
    { q: "Happiness is not something ready-made. It comes from your own actions.", a: "Dalai Lama" },
    { q: "It always seems impossible until it's done.", a: "Nelson Mandela" },
    { q: "Act as if what you do makes a difference. It does.", a: "William James" },
    { q: "Love is the bridge between you and everything.", a: "Rumi" },
    { q: "Be the change you wish to see in the world.", a: "Gandhi" },
    { q: "Light tomorrow with today.", a: "Elizabeth Barrett Browning" },
    { q: "Kind words cost nothing but mean everything.", a: "Unknown" },
    { q: "There is no exercise better for the heart than reaching down and lifting people up.", a: "J. Holmes" },
    { q: "A warm smile is the universal language of kindness.", a: "William Arthur Ward" },
    { q: "You matter. You are loved. You are enough.", a: "Unknown" },
    { q: "Together we can face any challenges as deep as the ocean and as high as the sky.", a: "Sonia Gandhi" },
    { q: "One kind word can change someone's entire day.", a: "Unknown" },
    { q: "Your life is your message to the world. Make it inspiring.", a: "Lorrin L. Lee" },
  ],
  hi: [
    { q: "छोटे काम बड़े प्यार से करो।", a: "मदर टेरेसा" },
    { q: "दयालु बनो, क्योंकि हर कोई कठिन लड़ाई लड़ रहा है।", a: "प्लेटो" },
    { q: "जहाँ प्यार है, वहाँ ईश्वर है।", a: "महात्मा गांधी" },
    { q: "प्यार और दयालुता कभी बर्बाद नहीं होती।", a: "बारबरा डी एंजेलिस" },
    { q: "दूसरों को उठाकर हम खुद ऊँचे होते हैं।", a: "रॉबर्ट इंगरसॉल" },
    { q: "खुद वो बदलाव बनो जो तुम दुनिया में देखना चाहते हो।", a: "महात्मा गांधी" },
    { q: "जीवन का उद्देश्य दूसरों की भलाई में योगदान देना है।", a: "रॉबर्ट एफ. केनेडी" },
    { q: "खुशी कोई तैयार चीज नहीं है। यह आपके अपने कार्यों से आती है।", a: "दलाई लामा" },
    { q: "जो असंभव लगता है, वह हो जाता है जब इंसान ठान ले।", a: "नेल्सन मंडेला" },
    { q: "प्यार तुम्हारे और हर चीज़ के बीच का पुल है।", a: "रूमी" },
    { q: "एक दयालु शब्द किसी का पूरा दिन बदल सकता है।", a: "अज्ञात" },
    { q: "आज से कल को रोशन करो।", a: "एलिजाबेथ बैरेट ब्राउनिंग" },
    { q: "मुस्कुराहट दयालुता की सार्वभौमिक भाषा है।", a: "विलियम आर्थर वार्ड" },
    { q: "तुम मायने रखते हो। तुम्हें प्यार किया जाता है। तुम काफी हो।", a: "अज्ञात" },
    { q: "जिंदगी छोटी है। दयालु बनो। कृतज्ञ रहो। वर्तमान में जियो।", a: "अज्ञात" },
    { q: "किसी को सबसे बड़ा उपहार तुम्हारा समय, ध्यान और प्यार है।", a: "अज्ञात" },
    { q: "दयालुता की एक छोटी सी क्रिया भी व्यर्थ नहीं जाती।", a: "ईसप" },
    { q: "हमेशा धूप की तरफ मुंह रखो, परछाईयाँ पीछे रह जाएंगी।", a: "वॉल्ट व्हिटमैन" },
    { q: "जो हमने एक बार आनंद लिया, हम उसे कभी नहीं खो सकते।", a: "हेलन केलर" },
    { q: "जो तुम करते हो वो फर्क पड़ता है — ऐसा मानकर काम करो।", a: "विलियम जेम्स" },
    { q: "अपना प्यार हर जगह फैलाओ।", a: "मदर टेरेसा" },
    { q: "दूसरों की सेवा में खुद को खोकर ही खुद को पाया जाता है।", a: "महात्मा गांधी" },
    { q: "प्यार दोनों तरफ से बहता है — पहले दो, फिर देखो।", a: "अज्ञात" },
    { q: "एक अच्छा काम उम्मीद के बिना करो।", a: "राजकुमारी डायना" },
    { q: "तुम्हारी मुस्कान दुनिया को थोड़ा बेहतर बनाती है।", a: "अज्ञात" },
    { q: "जो दिल से देता है, उसे हमेशा मिलता है।", a: "अज्ञात" },
    { q: "इंसानियत ही सबसे बड़ा धर्म है।", a: "अज्ञात" },
    { q: "नेकी कर, दरिया में डाल।", a: "हिंदी कहावत" },
    { q: "दूसरों में अच्छाई ढूंढो, यह तुम्हें भी अच्छा बनाएगा।", a: "अज्ञात" },
    { q: "तुम्हारी जिंदगी दुनिया के लिए एक संदेश है — उसे प्रेरणादायक बनाओ।", a: "अज्ञात" },
  ],
  kn: [
    { q: "ಸಣ್ಣ ಕೆಲಸಗಳನ್ನು ದೊಡ್ಡ ಪ್ರೀತಿಯಿಂದ ಮಾಡಿ.", a: "ಮದರ್ ತೆರೇಸಾ" },
    { q: "ದಯಾಳುವಾಗಿರಿ, ಏಕೆಂದರೆ ಎಲ್ಲರೂ ತಮ್ಮದೇ ಹೋರಾಟ ನಡೆಸುತ್ತಿದ್ದಾರೆ.", a: "ಪ್ಲೇಟೋ" },
    { q: "ನೀವು ಏನಾದರೂ ಆಗಬಹುದಾದ ಜಗತ್ತಿನಲ್ಲಿ, ದಯಾಳುವಾಗಿ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಪ್ರೀತಿ ಮತ್ತು ದಯೆ ಎಂದಿಗೂ ವ್ಯರ್ಥವಾಗುವುದಿಲ್ಲ.", a: "ಬಾರ್ಬರಾ ಡಿ ಆಂಜೆಲಿಸ್" },
    { q: "ಇತರರನ್ನು ಮೇಲೆತ್ತುವ ಮೂಲಕ ನಾವು ಮೇಲೇರುತ್ತೇವೆ.", a: "ರಾಬರ್ಟ್ ಇಂಗರ್‌ಸಾಲ್" },
    { q: "ನೀವು ಜಗತ್ತಿನಲ್ಲಿ ನೋಡಲು ಬಯಸುವ ಬದಲಾವಣೆಯೇ ನೀವಾಗಿ.", a: "ಗಾಂಧೀಜಿ" },
    { q: "ಪ್ರೀತಿ ನಿಮ್ಮ ಮತ್ತು ಎಲ್ಲದರ ನಡುವಿನ ಸೇತುವೆ.", a: "ರೂಮಿ" },
    { q: "ಖುಷಿ ತಯಾರಾದ ವಸ್ತುವಲ್ಲ. ಅದು ನಿಮ್ಮ ಕ್ರಿಯೆಗಳಿಂದ ಬರುತ್ತದೆ.", a: "ದಲಾಯಿ ಲಾಮಾ" },
    { q: "ಮುಗಿಯುವವರೆಗೆ ಅದು ಯಾವಾಗಲೂ ಅಸಾಧ್ಯವಾಗಿ ತೋರುತ್ತದೆ.", a: "ನೆಲ್ಸನ್ ಮಂಡೇಲಾ" },
    { q: "ನೀವು ಮಾಡುವುದು ವ್ಯತ್ಯಾಸ ಮಾಡುತ್ತದೆ ಎಂದು ಭಾವಿಸಿ ಕಾರ್ಯ ಮಾಡಿ.", a: "ವಿಲಿಯಂ ಜೇಮ್ಸ್" },
    { q: "ಒಂದು ದಯೆಯ ಮಾತು ಯಾರದೋ ಇಡೀ ದಿನವನ್ನು ಬದಲಾಯಿಸಬಲ್ಲದು.", a: "ಅಜ್ಞಾತ" },
    { q: "ಇಂದಿನಿಂದ ನಾಳೆಯನ್ನು ಬೆಳಗಿಸಿ.", a: "ಎಲಿಜಬೆತ್ ಬ್ಯಾರೆಟ್ ಬ್ರೌನಿಂಗ್" },
    { q: "ಮುಗುಳ್ನಗೆ ದಯೆಯ ಸಾರ್ವತ್ರಿಕ ಭಾಷೆ.", a: "ವಿಲಿಯಂ ಆರ್ಥರ್ ವಾರ್ಡ್" },
    { q: "ನೀವು ಮುಖ್ಯ. ನಿಮ್ಮನ್ನು ಪ್ರೀತಿಸಲಾಗುತ್ತದೆ. ನೀವು ಸಾಕು.", a: "ಅಜ್ಞಾತ" },
    { q: "ಜೀವನ ಚಿಕ್ಕದು. ದಯಾಳುವಾಗಿರಿ. ಕೃತಜ್ಞರಾಗಿರಿ. ವರ್ತಮಾನದಲ್ಲಿ ಇರಿ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಯಾರಿಗಾದರೂ ನೀಡಬಹುದಾದ ಅತ್ಯುತ್ತಮ ಉಡುಗೊರೆ ನಿಮ್ಮ ಸಮಯ ಮತ್ತು ಪ್ರೀತಿ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಪ್ರೀತಿಯನ್ನು ಎಲ್ಲೆಡೆ ಹರಡಿ.", a: "ಮದರ್ ತೆರೇಸಾ" },
    { q: "ಇತರರ ಸೇವೆಯಲ್ಲಿ ಕಳೆದುಕೊಳ್ಳುವ ಮೂಲಕ ನಿಮ್ಮನ್ನು ಕಂಡುಕೊಳ್ಳಿ.", a: "ಗಾಂಧೀಜಿ" },
    { q: "ಸೂರ್ಯನ ಕಡೆ ಮುಖ ಮಾಡಿ, ನೆರಳು ಹಿಂದೆ ಬೀಳುತ್ತದೆ.", a: "ವಾಲ್ಟ್ ವಿಟ್‌ಮನ್" },
    { q: "ಒಮ್ಮೆ ಆನಂದಿಸಿದ್ದನ್ನು ನಾವು ಎಂದಿಗೂ ಕಳೆದುಕೊಳ್ಳುವುದಿಲ್ಲ.", a: "ಹೆಲೆನ್ ಕೆಲ್ಲರ್" },
    { q: "ನಿಮ್ಮ ಜೀವನ ಜಗತ್ತಿಗೆ ಒಂದು ಸಂದೇಶ — ಅದನ್ನು ಪ್ರೇರಣಾದಾಯಕವಾಗಿ ಮಾಡಿ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಒಳ್ಳೆಯ ಕೆಲಸ ಮಾಡಿ ಮತ್ತು ಪ್ರತಿಫಲದ ನಿರೀಕ್ಷೆ ಇಡಬೇಡಿ.", a: "ರಾಜಕುಮಾರಿ ಡಯಾನಾ" },
    { q: "ಮಾನವೀಯತೆಯೇ ಅತ್ಯುನ್ನತ ಧರ್ಮ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಇತರರಲ್ಲಿ ಒಳ್ಳೆಯದನ್ನು ಹುಡುಕಿ — ಇದು ನಿಮ್ಮನ್ನೂ ಒಳ್ಳೆಯವರನ್ನಾಗಿ ಮಾಡುತ್ತದೆ.", a: "ಅಜ್ಞಾತ" },
    { q: "ನಿಮ್ಮ ನಗು ಜಗತ್ತನ್ನು ಸ್ವಲ್ಪ ಉತ್ತಮಗೊಳಿಸುತ್ತದೆ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಹೃದಯದಿಂದ ಕೊಡುವವನಿಗೆ ಯಾವಾಗಲೂ ಸಿಗುತ್ತದೆ.", a: "ಅಜ್ಞಾತ" },
    { q: "ಒಟ್ಟಾಗಿ ನಾವು ಯಾವ ಸವಾಲನ್ನೂ ಎದುರಿಸಬಹುದು.", a: "ಅಜ್ಞಾತ" },
    { q: "ಒಂದು ಸಣ್ಣ ದಯೆಯ ಕ್ರಿಯೆ ಎಂದಿಗೂ ವ್ಯರ್ಥವಾಗುವುದಿಲ್ಲ.", a: "ಈಸಾಪ್" },
    { q: "ಪ್ರೀತಿ ಹರಿಯುತ್ತದೆ — ಮೊದಲು ನೀಡಿ, ನಂತರ ನೋಡಿ.", a: "ಅಜ್ಞಾತ" },
    { q: "ನಿಮ್ಮ ನಡೆ ಜಗತ್ತಿಗೆ ಸ್ಫೂರ್ತಿ ನೀಡಲಿ.", a: "ಅಜ್ಞಾತ" },
  ],
};

function QuoteOfDay({ lang, onClose }) {
  // Pick quote based on day of year so it's consistent all day
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  const quotes = QUOTES[lang] || QUOTES.en;
  const { q, a } = quotes[dayOfYear % quotes.length];

  return (
    <div style={qd.overlay} onClick={onClose}>
      <div style={qd.card} className="animate-growIn" onClick={e=>e.stopPropagation()}>
        {/* Decorative top accent */}
        <div style={qd.accent}/>

        {/* Quote mark */}
        <div style={qd.bigQuote}>"</div>

        {/* Label */}
        <p style={qd.label}>✦ QUOTE OF THE DAY</p>

        {/* Quote text */}
        <p style={qd.quote}>{q}</p>

        {/* Author */}
        <p style={qd.author}>— {a}</p>

        {/* Divider */}
        <div style={qd.divider}/>

        {/* Close button */}
        <button style={qd.closeBtn} onClick={onClose}>
          Start your day 🌱
        </button>
        <button style={qd.skipBtn} onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

const qd = {
  overlay: {
    position:'fixed', inset:0,
    background:'rgba(0,0,0,0.72)',
    backdropFilter:'blur(8px)',
    WebkitBackdropFilter:'blur(8px)',
    zIndex:500,
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:24,
  },
  card: {
    position:'relative',
    background:'var(--surface)',
    borderRadius:28,
    padding:'48px 40px 36px',
    width:'100%',
    maxWidth:480,
    boxShadow:'0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px var(--border-2)',
    textAlign:'center',
    overflow:'hidden',
  },
  accent: {
    position:'absolute', top:0, left:0, right:0, height:4,
    background:'var(--grad-accent)',
  },
  bigQuote: {
    fontFamily:"'DM Serif Display',Georgia,serif",
    fontSize:120, lineHeight:0.7,
    color:'var(--green-glow)',
    marginBottom:16,
    userSelect:'none',
    color:'var(--border-2)',
  },
  label: {
    fontSize:11, fontWeight:700, letterSpacing:'0.12em',
    color:'var(--green-mid)', marginBottom:20,
    textTransform:'uppercase',
  },
  quote: {
    fontFamily:"'DM Serif Display',Georgia,serif",
    fontSize:26, fontWeight:400, fontStyle:'italic',
    color:'var(--text-1)', lineHeight:1.55,
    marginBottom:20,
    letterSpacing:'-0.01em',
  },
  author: {
    fontSize:14, color:'var(--text-3)',
    fontWeight:500, letterSpacing:'0.02em',
    marginBottom:28,
  },
  divider: {
    height:1, background:'var(--border)',
    marginBottom:24, marginLeft:40, marginRight:40,
  },
  closeBtn: {
    display:'inline-flex', alignItems:'center', gap:8,
    padding:'13px 32px',
    background:'var(--grad-accent)',
    color:'#fff', border:'none',
    borderRadius:100, cursor:'pointer',
    fontSize:15, fontWeight:600,
    fontFamily:"'Plus Jakarta Sans',sans-serif",
    boxShadow:'0 4px 20px rgba(82,183,136,0.4)',
    transition:'all 0.2s',
    width:'100%', justifyContent:'center',
    marginBottom:12,
  },
  skipBtn: {
    background:'none', border:'none',
    cursor:'pointer', color:'var(--text-3)',
    fontSize:13, fontWeight:500,
    fontFamily:"'Plus Jakarta Sans',sans-serif",
    padding:'4px 8px',
  },
};
function HomeView({ user, plants, loading, t, tn, dc, lang, onGarden, onAdd, onPlantClick, onWater, wateringId, onDelete }) {
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
              <span>✦ {t.addPlant}</span>
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
      {/* ── PLANT TIPS CAROUSEL ── */}
      <PlantTipsCarousel t={t}/>

      {/* ── SEASON BANNER ── */}
      <SeasonBanner t={t}/>

      {/* ── PLANT FACTS ── */}
      <PlantFacts t={t}/>

      {/* ── GROWING TIPS ── */}
      <GrowingTips t={t}/>

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
/* ── Plant Tips Carousel (auto-rotate like Plant Facts) ── */
function PlantTipsCarousel({ t }) {
  const tips = TIPS(t);
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);

  function goTo(i) {
    setAnim(false);
    setTimeout(()=>{ setIdx(i); setAnim(true); }, 100);
  }

  useEffect(()=>{
    const timer = setInterval(()=>goTo((idx+1)%tips.length), 4000);
    return ()=>clearInterval(timer);
  },[idx, tips.length]);

  const tip = tips[idx];

  return (
    <section style={hv.section} className="animate-fadeUp">
      <div style={hv.secRow}>
        <h2 style={hv.secTitle}>{t.plantTips||'🌿 Plant Tips'}</h2>
        <span style={hv.secSub}>{idx+1} / {tips.length}</span>
      </div>
      <div style={{...pf.card, borderLeft:`4px solid ${tip.color}`}}>
        <div style={pf.tagRow}>
          <span style={{...pf.tag, background:`${tip.color}18`, color:tip.color, border:`1px solid ${tip.color}30`}}>
            {tip.icon} {tip.title}
          </span>
          <div style={pf.dots}>
            {tips.map((_,i)=>(
              <button key={i} style={{...pf.dot,...(i===idx?{...pf.dotOn,background:tip.color}:{})}} onClick={()=>goTo(i)}/>
            ))}
          </div>
        </div>
        <div style={{...pf.body, opacity:anim?1:0, transform:anim?'translateY(0)':'translateY(8px)', transition:'all 0.2s', alignItems:'center'}}>
          <div style={{width:56,height:56,borderRadius:16,background:`${tip.color}15`,border:`1px solid ${tip.color}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:28}}>{tip.icon}</span>
          </div>
          <p style={{...pf.fact, fontSize:15, lineHeight:1.7}}>{tip.back}</p>
        </div>
        <div style={pf.arrows}>
          <button style={pf.arrow} onClick={()=>goTo((idx-1+tips.length)%tips.length)}>←</button>
          <button style={pf.arrow} onClick={()=>goTo((idx+1)%tips.length)}>→</button>
        </div>
      </div>
    </section>
  );
}

const TIPS = (t) => [
  {icon:'💧', title:t.tipWateringTitle||'Watering',    front:t.tipWateringFront||'Proper hydration is key to plant health.',  back:t.tipWateringBack||'Check soil moisture 1" deep before watering.',  color:'#3a86b4'},
  {icon:'☀️', title:t.tipSunlightTitle||'Sunlight',   front:t.tipSunlightFront||'Light is food for your plants.',            back:t.tipSunlightBack||'Rotate your plants 90° weekly for even growth.',  color:'#d4860a'},
  {icon:'🌡️', title:t.tipTempTitle||'Temperature',    front:t.tipTempFront||'Temperature swings stress plants.',             back:t.tipTempBack||'Keep plants away from AC vents and cold drafts.',      color:'#c0485a'},
  {icon:'🌱', title:t.tipSoilTitle||'Soil',           front:t.tipSoilFront||'Good soil = healthy roots = thriving plant.',   back:t.tipSoilBack||'Refresh potting mix every 1–2 years.',               color:'#2d6a4f'},
  {icon:'✂️', title:t.tipPruningTitle||'Pruning',     front:t.tipPruningFront||'Pruning encourages bushier, fuller growth.', back:t.tipPruningBack||'Always cut above a leaf node at 45°.',             color:'#7b5ea7'},
  {icon:'🪱', title:t.tipFertTitle||'Fertilizing',    front:t.tipFertFront||'Feed your plants during their growth season.',  back:t.tipFertBack||'Use a balanced NPK fertilizer every 2–4 weeks.',     color:'#5a6e44'},
];


/* ── Plant Facts carousel ── */
const FACTS = (t) => [
  { emoji:'🌳', fact:t.fact1||'The world\'s oldest living tree is over 5,000 years old.', tag:t.factTag1||'Did You Know?' },
  { emoji:'🌿', fact:t.fact2||'Plants communicate through underground fungal networks.', tag:t.factTag2||'Science' },
  { emoji:'💨', fact:t.fact3||'A mature tree absorbs 21 kg of CO₂ per year.', tag:t.factTag3||'Environment' },
  { emoji:'🌺', fact:t.fact4||'There are over 400,000 known plant species on Earth.', tag:t.factTag4||'Biodiversity' },
  { emoji:'🍃', fact:t.fact5||'The Venus flytrap can snap shut in 0.1 seconds.', tag:t.factTag5||'Amazing' },
  { emoji:'🌵', fact:t.fact6||'Cacti can survive years without rain.', tag:t.factTag6||'Survival' },
  { emoji:'🌸', fact:t.fact7||'Bamboo grows up to 91 cm in a single day.', tag:t.factTag7||'Record' },
  { emoji:'🍀', fact:t.fact8||'Plants grow toward light; roots grow toward gravity.', tag:t.factTag8||'Biology' },
];

function PlantFacts({ t }) {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);
  const facts = FACTS(t);
  
  function goTo(i) {
    setAnim(false);
    setTimeout(()=>{ setIdx(i); setAnim(true); }, 80);
  }
  
  useEffect(()=>{
    const timer = setInterval(()=>goTo((idx+1)%facts.length), 5000);
    return ()=>clearInterval(timer);
  },[idx]);

  const f = facts[idx];
  return (
    <section style={hv.section} className="animate-fadeUp">
      <div style={hv.secRow}>
        <h2 style={hv.secTitle}>{t.plantFacts||'🌍 Plant Facts'}</h2>
        <span style={hv.secSub}>{idx+1} {t.factOf||'/'} {facts.length}</span>
      </div>
      <div style={pf.card}>
        <div style={pf.tagRow}>
          <span style={pf.tag}>{f.tag}</span>
          <div style={pf.dots}>
            {facts.map((_,i)=>(
              <button key={i} style={{...pf.dot,...(i===idx?pf.dotOn:{})}} onClick={()=>goTo(i)}/>
            ))}
          </div>
        </div>
        <div style={{...pf.body,opacity:anim?1:0,transform:anim?'translateY(0)':'translateY(8px)',transition:'all 0.2s'}}>
          <span style={pf.emoji}>{f.emoji}</span>
          <p style={pf.fact}>{f.fact}</p>
        </div>
        <div style={pf.arrows}>
          <button style={pf.arrow} onClick={()=>goTo((idx-1+facts.length)%facts.length)}>←</button>
          <button style={pf.arrow} onClick={()=>goTo((idx+1)%facts.length)}>→</button>
        </div>
      </div>
    </section>
  );
}

/* ── Common Growing Tips ── */
const GROWING_TIPS = (t) => [
  { icon:'🪴', title:t.gtPotTitle||'Choose the Right Pot', tip:t.gtPotTip||'Always use pots with drainage holes.', color:'#2d6a4f' },
  { icon:'💡', title:t.gtLightTitle||'Light First, Water Second', tip:t.gtLightTip||'Assess your light conditions before buying any plant.', color:'#d4860a' },
  { icon:'🌡️', title:t.gtNewTitle||'Acclimatize New Plants', tip:t.gtNewTip||'New plants need 1–2 weeks to adjust.', color:'#3a86b4' },
  { icon:'📅', title:t.gtSeasonTitle||'Seasonal Routine', tip:t.gtSeasonTip||'Water more in summer, less in winter.', color:'#7b5ea7' },
  { icon:'🔬', title:t.gtInspectTitle||'Inspect Weekly', tip:t.gtInspectTip||'Check the undersides of leaves weekly.', color:'#c0485a' },
  { icon:'✂️', title:t.gtDeadTitle||'Dead-head Regularly', tip:t.gtDeadTip||'Remove spent flowers and yellow leaves promptly.', color:'#52b788' },
];

function GrowingTips({ t }) {
  const [open, setOpen] = useState(null);
  const tips = GROWING_TIPS(t);
  return (
    <section style={{...hv.section,marginBottom:24}} className="animate-fadeUp">
      <div style={hv.secRow}>
        <h2 style={hv.secTitle}>{t.growingTips||'📚 Growing Tips'}</h2>
        <span style={hv.secSub}>{t.tapToExpand||'Tap to expand'}</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {tips.map((tip,i)=>(
          <div key={i} style={{
            background:'var(--surface)', border:`1px solid ${open===i?tip.color+'50':'var(--border)'}`,
            borderRadius:14, overflow:'hidden',
            boxShadow: open===i ? `0 4px 20px ${tip.color}18` : 'var(--shadow-xs)',
            transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}>
            <button style={{
              width:'100%', display:'flex', alignItems:'center', gap:12,
              padding:'14px 16px', background:'none', border:'none', cursor:'pointer',
              textAlign:'left',
            }} onClick={()=>setOpen(open===i?null:i)}>
              <span style={{width:36,height:36,borderRadius:10,background:`${tip.color}15`,border:`1px solid ${tip.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tip.icon}</span>
              <span style={{flex:1,fontSize:14,fontWeight:600,color:'var(--text-1)',fontFamily:"'DM Serif Display',Georgia,serif"}}>{tip.title}</span>
              <span style={{fontSize:16,color:'var(--text-3)',transition:'transform 0.25s',transform:open===i?'rotate(45deg)':'rotate(0deg)'}}>+</span>
            </button>
            {open===i&&(
              <div style={{padding:'0 16px 16px 64px'}} className="animate-fadeIn">
                <p style={{fontSize:13,color:'var(--text-2)',lineHeight:1.7}}>{tip.tip}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
function SeasonBanner({ t }) {
  const month = new Date().getMonth();
  const seasons = [
    {name:t.winterName||'Winter', icon:'❄️', tip:t.winterTip||'Reduce watering. Plants are dormant.', color:'#3a86b4'},
    {name:t.winterName||'Winter', icon:'❄️', tip:t.winterTip||'Reduce watering. Plants are dormant.', color:'#3a86b4'},
    {name:t.springName||'Spring', icon:'🌸', tip:t.springTip||'Start fertilizing! Great time to propagate.', color:'#c0485a'},
    {name:t.springName||'Spring', icon:'🌸', tip:t.springTip||'Start fertilizing! Great time to propagate.', color:'#c0485a'},
    {name:t.springName||'Spring', icon:'🌸', tip:t.springTip||'Start fertilizing! Great time to propagate.', color:'#c0485a'},
    {name:t.summerName||'Summer', icon:'☀️', tip:t.summerTip||'Water more. Watch for pests.', color:'#d4860a'},
    {name:t.summerName||'Summer', icon:'☀️', tip:t.summerTip||'Water more. Watch for pests.', color:'#d4860a'},
    {name:t.summerName||'Summer', icon:'☀️', tip:t.summerTip||'Water more. Watch for pests.', color:'#d4860a'},
    {name:t.autumnName||'Autumn', icon:'🍂', tip:t.autumnTip||'Slow fertilizing. Bring plants inside.', color:'#c0485a'},
    {name:t.autumnName||'Autumn', icon:'🍂', tip:t.autumnTip||'Slow fertilizing. Bring plants inside.', color:'#c0485a'},
    {name:t.autumnName||'Autumn', icon:'🍂', tip:t.autumnTip||'Slow fertilizing. Bring plants inside.', color:'#c0485a'},
    {name:t.winterName||'Winter', icon:'❄️', tip:t.winterTip||'Reduce watering. Plants are dormant.', color:'#3a86b4'},
  ];
  const s = seasons[month];
  return (
    <div style={{...sb.wrap,borderLeft:`4px solid ${s.color}`}} className="animate-fadeUp">
      <div style={sb.left}>
        <span style={sb.icon}>{s.icon}</span>
        <div>
          <p style={sb.label}>{s.name} {t.seasonCareTip||'Care Tip'}</p>
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
          <p style={gv.sub}>{plants.length} {plants.length!==1?t.plants:t.plant||'plant'} {t.inYourCollection||'in your collection'}</p>
        </div>
        <button className="btn btn-primary btn-sm hide-mobile" onClick={onAdd}>+ {t.addPlant}</button>
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
  brandTxt:{fontFamily:"'DM Serif Display',Georgia,serif",fontSize:20,fontWeight:400,fontStyle:'italic',color:'var(--text-1)',letterSpacing:'0.01em'},
  navR:    {display:'flex',alignItems:'center',gap:6},
  langPill:{display:'flex',background:'var(--surface-2)',borderRadius:100,padding:3,gap:2,border:'1px solid var(--border-2)'},
  langBtn: {padding:'4px 10px',borderRadius:100,border:'none',background:'transparent',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text-3)',transition:'all 0.18s',fontFamily:"'Plus Jakarta Sans',sans-serif"},
  langOn:  {background:'var(--green)',color:'#fff'},
  iconBtn: {width:36,height:36,borderRadius:10,border:'1px solid var(--border-2)',background:'var(--surface-2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'},
  notifDot:{position:'absolute',top:-3,right:-3,background:'var(--rose)',color:'white',borderRadius:'50%',width:16,height:16,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  layout:  {display:'flex',flex:1,overflow:'hidden'},
  main:    {flex:1,overflowY:'auto',overflowX:'hidden'},
  bnav:    {position:'fixed',bottom:0,left:0,right:0,background:'var(--nav-bg)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderTop:'1px solid var(--border)',padding:'8px 20px 16px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  fab:     {width:52,height:52,borderRadius:'50%',background:'var(--grad-accent)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 24px rgba(82,183,136,0.45)',marginBottom:4},
};

const sd = {
  btn:     {display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:14,border:'none',background:'transparent',cursor:'pointer',width:'100%',transition:'all 0.18s',color:'var(--text-2)',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:500,position:'relative'},
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
  heroName: {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:44,fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:8,letterSpacing:'-0.02em'},
  heroSub:  {fontSize:15,color:'rgba(255,255,255,0.72)',marginBottom:24},
  heroAddBtn:{display:'inline-flex',alignItems:'center',gap:8,padding:'11px 22px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:100,color:'white',fontSize:14,fontWeight:600,cursor:'pointer',backdropFilter:'blur(10px)',transition:'all 0.22s',fontFamily:"'Plus Jakarta Sans',sans-serif"},
  healthOrb: {position:'relative',width:120,height:120,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  healthInner:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'},
  healthVal: {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:28,fontWeight:800,color:'white',lineHeight:1},
  healthLbl: {fontSize:10,color:'rgba(255,255,255,0.6)',letterSpacing:'0.08em',textTransform:'uppercase'},
  statsRow:  {position:'relative',zIndex:2,display:'flex',gap:0,marginTop:24,borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:20,paddingBottom:20},
  stat:      {flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,borderRight:'1px solid rgba(255,255,255,0.08)'},
  statIcon:  {fontSize:18},
  statVal:   {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:26,fontWeight:700,color:'white',lineHeight:1},
  statLbl:   {fontSize:11,color:'rgba(255,255,255,0.55)',letterSpacing:'0.04em'},
  section:   {marginBottom:24},
  secRow:    {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  secTitle:  {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:20,fontWeight:700,color:'var(--text-1)'},
  secSub:    {fontSize:12,color:'var(--text-3)'},
  tipsGrid:  {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12},
  seeAllBtn: {background:'none',border:'none',color:'var(--green-lite)',fontSize:14,fontWeight:600,cursor:'pointer'},
  plantGrid: {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16},
  empty:     {textAlign:'center',padding:'60px 20px'},
  emptyOrb:  {width:120,height:120,borderRadius:'50%',background:'var(--green-glow)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'},
  emptyTitle:{fontFamily:"'DM Serif Display',Georgia,serif",fontSize:28,fontWeight:700,color:'var(--text-1)',marginBottom:10},
  emptySub:  {color:'var(--text-3)',lineHeight:1.6,maxWidth:300,margin:'0 auto'},
};

/* ft styles removed — FlipTip now uses inline styles */

const pf = {
  card:  {background:'var(--surface)',border:'1px solid var(--border-2)',borderRadius:20,padding:'20px 24px',boxShadow:'var(--shadow-sm)'},
  tagRow:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  tag:   {fontSize:11,fontWeight:700,color:'var(--green-mid)',background:'var(--green-glow)',padding:'4px 12px',borderRadius:100,letterSpacing:'0.06em',textTransform:'uppercase'},
  dots:  {display:'flex',gap:5},
  dot:   {width:6,height:6,borderRadius:'50%',background:'var(--border-2)',border:'none',cursor:'pointer',padding:0,transition:'all 0.2s'},
  dotOn: {background:'var(--green-mid)',transform:'scale(1.4)'},
  body:  {display:'flex',alignItems:'flex-start',gap:16,marginBottom:16},
  emoji: {fontSize:40,flexShrink:0,lineHeight:1},
  fact:  {fontSize:15,color:'var(--text-1)',lineHeight:1.7,fontWeight:500},
  arrows:{display:'flex',gap:10,justifyContent:'flex-end'},
  arrow: {width:36,height:36,borderRadius:10,border:'1px solid var(--border-2)',background:'var(--surface-2)',cursor:'pointer',fontSize:16,color:'var(--text-2)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'},
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
  name:    {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:16,fontWeight:700,color:'var(--text-1)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  sci:     {fontSize:11,fontStyle:'italic',color:'var(--text-3)',marginBottom:8,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  footer:  {display:'flex',justifyContent:'space-between',alignItems:'center'},
  days:    {fontSize:12,color:'var(--text-3)'},
  guide:   {fontSize:11,color:'var(--green-lite)',fontWeight:600},
};

const gv = {
  page:      {maxWidth:1000,margin:'0 auto',padding:'20px 20px 0'},
  hdr:       {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12},
  title:     {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:28,fontWeight:800,color:'var(--text-1)',letterSpacing:'-0.02em'},
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
  btn:    {display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:'none',border:'none',cursor:'pointer',padding:'8px 20px',borderRadius:12,color:'var(--text-3)',transition:'all 0.18s',fontFamily:"'Plus Jakarta Sans',sans-serif"},
  active: {color:'var(--green)'},
  label:  {fontSize:11,fontWeight:600},
};

const mo = {
  bd:    {position:'fixed',inset:0,background:'var(--overlay)',backdropFilter:'blur(8px)',zIndex:200},
  box:   {position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--surface)',borderRadius:24,padding:'32px 28px',zIndex:201,width:'min(90vw,380px)',textAlign:'center',boxShadow:'var(--shadow-lg)',border:'1px solid var(--border-2)'},
  emoji: {fontSize:44,marginBottom:14},
  title: {fontFamily:"'DM Serif Display',Georgia,serif",fontSize:22,fontWeight:700,color:'var(--text-1)',marginBottom:8},
  desc:  {color:'var(--text-3)',fontSize:14,lineHeight:1.6},
};

// Desktop sidebar needs width
const sidebarStyle = { width:220, background:'var(--surface)', borderRight:'1px solid var(--border)', padding:'16px 12px', display:'flex', flexDirection:'column', gap:2, position:'sticky', top:58, height:'calc(100vh - 58px)', flexShrink:0, overflowY:'auto' };
