import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const LANG_NAMES = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  kn: 'Kannada (ಕನ್ನಡ)'
};

// ─── GROQ API CALL ─────────────────────────────────────────────────
async function callGroq(messages, jsonMode = false) {
  const body = { model: MODEL, messages, temperature: 0.3, max_tokens: 4096 };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── SAFE JSON PARSER ───────────────────────────────────────────────
function parseJSON(raw) {
  let text = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  try { return JSON.parse(text); }
  catch (e) {
    console.error('JSON parse failed:', text.slice(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ─── IDENTIFY BY NAME ───────────────────────────────────────────────
export async function identifyPlantByName(name, lang = 'en') {
  const langName = LANG_NAMES[lang] || 'English';
  const text = await callGroq([
    {
      role: 'system',
      content: `You are a professional botanist. Always respond with valid JSON only, no extra text. All text fields (except scientificName and family) must be in ${langName}.`
    },
    {
      role: 'user',
      content: `Identify the plant "${name}" and return ONLY this JSON:
{
  "identified": true,
  "commonName": "Common name in ${langName}",
  "scientificName": "Scientific binomial name (always in Latin)",
  "family": "Plant family (in Latin)",
  "confidence": 95,
  "alternatives": [{"commonName": "Alt name in ${langName}", "scientificName": "Alt scientific", "description": "brief description in ${langName}"}],
  "note": "Clarification in ${langName} if ambiguous"
}
If not a plant, set identified to false.`
    }
  ], true);
  return parseJSON(text);
}

// ─── IDENTIFY BY IMAGE ──────────────────────────────────────────────
export async function identifyPlantByImage(base64Image, mimeType = 'image/jpeg', lang = 'en') {
  const langName = LANG_NAMES[lang] || 'English';
  const body = {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        {
          type: 'text',
          text: `You are a botanist. Identify this plant and return ONLY this JSON. All text fields except scientificName must be in ${langName}:
{
  "identified": true,
  "commonName": "Common name in ${langName}",
  "scientificName": "Scientific binomial (always Latin)",
  "family": "Plant family (Latin)",
  "confidence": 90,
  "identificationDetails": "Key identifying features in ${langName}",
  "alternatives": [{"commonName": "Alt in ${langName}", "scientificName": "Alt scientific", "confidence": 75}]
}
If not a plant, set identified to false.`
        }
      ]
    }],
    temperature: 0.3,
    max_tokens: 1024,
    response_format: { type: 'json_object' }
  };

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Groq vision error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parseJSON(data.choices[0].message.content);
}

// ─── GENERATE CARE GUIDE ────────────────────────────────────────────
export async function generateCareGuide(plantName, scientificName, lang = 'en') {
  const langName = LANG_NAMES[lang] || 'English';
  const text = await callGroq([
    {
      role: 'system',
      content: `You are an expert botanist. Always respond with valid JSON only, no extra text. All descriptive text fields must be written in ${langName}. Keep field keys in English always.`
    },
    {
      role: 'user',
      content: `Generate a complete plant care guide for ${plantName} (${scientificName}).
ALL text values must be in ${langName}. Keys stay in English. Return ONLY this JSON:
{
  "overview": "2-3 sentence description in ${langName}",
  "difficulty": "Beginner or Intermediate or Expert (in English)",
  "type": "Indoor or Outdoor or Both (in English)",
  "lifespan": "lifespan in ${langName}",
  "nativeRegion": "origin in ${langName}",
  "soil": {"type": "in ${langName}", "ph": "6.0-7.0", "mix": "in ${langName}", "tips": "in ${langName}"},
  "watering": {"frequency": "in ${langName}", "amount": "in ${langName}", "method": "in ${langName}", "overdoSigns": ["in ${langName}"], "underdoSigns": ["in ${langName}"], "tips": "in ${langName}"},
  "sunlight": {"requirement": "in ${langName}", "hoursPerDay": "hours", "indoorPlacement": "in ${langName}", "tips": "in ${langName}"},
  "temperature": {"ideal": "range", "minimum": "min", "maximum": "max", "humidity": "in ${langName}", "frostTolerant": false, "tips": "in ${langName}"},
  "fertilizer": {"type": "in ${langName}", "frequency": "in ${langName}", "season": "in ${langName}", "organic": "in ${langName}", "tips": "in ${langName}"},
  "potting": {"potSize": "in ${langName}", "material": "in ${langName}", "repottingFrequency": "in ${langName}", "repottingSign": "in ${langName}", "tips": "in ${langName}"},
  "pruning": {"needed": true, "frequency": "in ${langName}", "method": "in ${langName}", "tips": "in ${langName}"},
  "propagation": {"methods": ["in ${langName}"], "bestMethod": "in ${langName}", "bestSeason": "in ${langName}", "steps": ["in ${langName}"]},
  "commonProblems": [{"problem": "in ${langName}", "symptoms": "in ${langName}", "cause": "in ${langName}", "solution": "in ${langName}"}],
  "pests": [{"pest": "in ${langName}", "symptoms": "in ${langName}", "treatment": "in ${langName}"}],
  "growthTimeline": [
    {"period": "Week 1-2", "expectation": "in ${langName}"},
    {"period": "Month 1", "expectation": "in ${langName}"},
    {"period": "Month 3", "expectation": "in ${langName}"},
    {"period": "Month 6", "expectation": "in ${langName}"},
    {"period": "Year 1", "expectation": "in ${langName}"}
  ],
  "companions": ["plant name in ${langName}"],
  "toxicity": {"toxic": false, "toHumans": "in ${langName}", "toPets": "in ${langName}", "details": "in ${langName}"},
  "reminderSchedule": {"wateringDays": 3, "fertilizingDays": 14, "repottingMonths": 12}
}`
    }
  ], true);
  return parseJSON(text);
}

// ─── PLANT CHAT ─────────────────────────────────────────────────────
export async function chatWithPlantExpert(plantData, chatHistory, userMessage, daysSinceAdded, lang = 'en') {
  const langName = LANG_NAMES[lang] || 'English';
  const messages = [
    {
      role: 'system',
      content: `You are an expert botanist helping a user grow their ${plantData.plant_name} (${plantData.scientific_name || ''}).
The user has been growing this plant for ${daysSinceAdded} days.
Care Guide: ${JSON.stringify(plantData.care_guide || {})}
Recent journal: ${plantData.journal_entries?.map(e => `[${e.logged_at}]: ${e.note}`).join(', ') || 'None'}
IMPORTANT: Always respond in ${langName}. Give specific, helpful, encouraging advice. Keep responses concise and practical.`
    },
    ...chatHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.message })),
    { role: 'user', content: userMessage }
  ];
  return await callGroq(messages, false);
}

// ─── REMINDER MESSAGE ───────────────────────────────────────────────
export async function generateReminderMessage(plantName, reminderType, daysSince, lang = 'en') {
  const langName = LANG_NAMES[lang] || 'English';
  const text = await callGroq([{
    role: 'user',
    content: `Write a short friendly push notification (max 100 chars) in ${langName} reminding user to ${reminderType} their ${plantName}. ${daysSince} days have passed. No quotes.`
  }], false);
  return text.trim();
}

// ─── BATCH TRANSLATE PLANT NAMES ───────────────────────────────────────────
export async function translatePlantNames(names, lang = 'en') {
  if (lang === 'en') return {};
  const langName = LANG_NAMES[lang] || 'English';
  const text = await callGroq([
    {
      role: 'system',
      content: `You are a botanist. Translate common plant names to ${langName}. Respond ONLY with a valid JSON object mapping each English name to its ${langName} translation. Keep it natural and commonly used. Example: {"Rose":"ಗುಲಾಬಿ","Tulip":"ಟ್ಯೂಲಿಪ್"}`
    },
    {
      role: 'user',
      content: `Translate these plant names to ${langName}: ${JSON.stringify(names)}`
    }
  ], false);
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) { return {}; }
}