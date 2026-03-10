import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ─── GROQ API CALL ────────────────────────────────────────────────────────────
async function callGroq(messages, jsonMode = false) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── SAFE JSON PARSER ─────────────────────────────────────────────────────────
function parseJSON(raw) {
  let text = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse failed:', text.slice(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ─── IDENTIFY BY NAME ─────────────────────────────────────────────────────────
export async function identifyPlantByName(name) {
  const text = await callGroq([
    {
      role: 'system',
      content: 'You are a professional botanist. Always respond with valid JSON only, no extra text.'
    },
    {
      role: 'user',
      content: `Identify the plant "${name}" and return ONLY this JSON:
{
  "identified": true,
  "commonName": "Most common name",
  "scientificName": "Scientific binomial name",
  "family": "Plant family",
  "confidence": 95,
  "alternatives": [{"commonName": "Alt", "scientificName": "Alt scientific", "description": "brief"}],
  "note": "Clarification if ambiguous"
}
If not a plant, set identified to false.`
    }
  ], true);
  return parseJSON(text);
}

// ─── IDENTIFY BY IMAGE ────────────────────────────────────────────────────────
// Groq's Llama doesn't support vision, so we use llama text with a description request
export async function identifyPlantByImage(base64Image, mimeType = 'image/jpeg') {
  // Use llama-3.2-11b-vision-preview for image support
  const body = {
    model: 'llama-3.2-11b-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
          },
          {
            type: 'text',
            text: `You are a botanist. Identify this plant and return ONLY this JSON:
{
  "identified": true,
  "commonName": "Most common name",
  "scientificName": "Scientific binomial name",
  "family": "Plant family",
  "confidence": 90,
  "identificationDetails": "Key identifying features you noticed",
  "alternatives": [{"commonName": "Alt", "scientificName": "Alt scientific", "confidence": 75}]
}
If not a plant, set identified to false.`
          }
        ]
      }
    ],
    temperature: 0.3,
    max_tokens: 1024,
    response_format: { type: 'json_object' }
  };

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq vision error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return parseJSON(data.choices[0].message.content);
}

// ─── GENERATE CARE GUIDE ──────────────────────────────────────────────────────
export async function generateCareGuide(plantName, scientificName) {
  const text = await callGroq([
    {
      role: 'system',
      content: 'You are an expert botanist. Always respond with valid JSON only, no extra text.'
    },
    {
      role: 'user',
      content: `Generate a complete plant care guide for ${plantName} (${scientificName}).
Return ONLY this JSON (fill in real accurate values):
{
  "overview": "2-3 sentence plant description",
  "difficulty": "Beginner",
  "type": "Indoor",
  "lifespan": "Perennial",
  "nativeRegion": "Origin region",
  "soil": {"type": "soil type", "ph": "6.0-7.0", "mix": "mix details", "tips": "tips"},
  "watering": {"frequency": "frequency", "amount": "amount", "method": "method", "overdoSigns": ["sign1", "sign2"], "underdoSigns": ["sign1", "sign2"], "tips": "tips"},
  "sunlight": {"requirement": "requirement", "hoursPerDay": "hours", "indoorPlacement": "placement", "tips": "tips"},
  "temperature": {"ideal": "range", "minimum": "min", "maximum": "max", "humidity": "humidity", "frostTolerant": false, "tips": "tips"},
  "fertilizer": {"type": "type", "frequency": "frequency", "season": "season", "organic": "organic option", "tips": "tips"},
  "potting": {"potSize": "size", "material": "material", "repottingFrequency": "frequency", "repottingSign": "signs", "tips": "tips"},
  "pruning": {"needed": true, "frequency": "frequency", "method": "method", "tips": "tips"},
  "propagation": {"methods": ["method1", "method2"], "bestMethod": "best", "bestSeason": "season", "steps": ["step1", "step2", "step3"]},
  "commonProblems": [{"problem": "name", "symptoms": "symptoms", "cause": "cause", "solution": "solution"}],
  "pests": [{"pest": "name", "symptoms": "symptoms", "treatment": "treatment"}],
  "growthTimeline": [
    {"period": "Week 1-2", "expectation": "what happens"},
    {"period": "Month 1", "expectation": "what happens"},
    {"period": "Month 3", "expectation": "what happens"},
    {"period": "Month 6", "expectation": "what happens"},
    {"period": "Year 1", "expectation": "what happens"}
  ],
  "companions": ["plant1", "plant2"],
  "toxicity": {"toxic": false, "toHumans": "Safe", "toPets": "Safe", "details": "details"},
  "reminderSchedule": {"wateringDays": 3, "fertilizingDays": 14, "repottingMonths": 12}
}`
    }
  ], true);
  return parseJSON(text);
}

// ─── PLANT CHAT ───────────────────────────────────────────────────────────────
export async function chatWithPlantExpert(plantData, chatHistory, userMessage, daysSinceAdded) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert botanist helping a user grow their ${plantData.plant_name} (${plantData.scientific_name || ''}).
The user has been growing this plant for ${daysSinceAdded} days.
Care Guide: ${JSON.stringify(plantData.care_guide || {})}
Recent journal: ${plantData.journal_entries?.map(e => `[${e.logged_at}]: ${e.note}`).join(', ') || 'None'}
Give specific, helpful, encouraging advice. Keep responses concise and practical.`
    },
    ...chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.message
    })),
    { role: 'user', content: userMessage }
  ];

  return await callGroq(messages, false);
}

// ─── REMINDER MESSAGE ─────────────────────────────────────────────────────────
export async function generateReminderMessage(plantName, reminderType, daysSince) {
  const text = await callGroq([
    {
      role: 'user',
      content: `Write a short friendly push notification (max 100 chars) reminding user to ${reminderType} their ${plantName}. ${daysSince} days have passed. No quotes.`
    }
  ], false);
  return text.trim();
}
