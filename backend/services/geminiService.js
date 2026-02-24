import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getTextModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
export const getVisionModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─── SAFE JSON PARSER ────────────────────────────────────────────────────────
function parseJSON(raw) {
  let text = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse failed, raw:', text.slice(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ─── IDENTIFY BY NAME ────────────────────────────────────────────────────────
export async function identifyPlantByName(name) {
  const model = getTextModel();
  const prompt = `You are a professional botanist. A user typed "${name}" as a plant name.
  Your tasks:
  1. Identify the exact plant they mean
  2. Return ONLY a valid JSON object (no markdown, no backticks, no extra text)
  
  JSON format:
  {
    "identified": true,
    "commonName": "Most common name",
    "scientificName": "Scientific binomial name",
    "family": "Plant family",
    "confidence": 95,
    "alternatives": [
      {"commonName": "...", "scientificName": "...", "description": "brief 1-line description"}
    ],
    "note": "Any clarification note if name was ambiguous"
  }
  If the input is not a plant at all, set identified to false.`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

// ─── IDENTIFY BY IMAGE ───────────────────────────────────────────────────────
export async function identifyPlantByImage(base64Image, mimeType = 'image/jpeg') {
  const model = getVisionModel();
  const prompt = `You are a professional botanist and plant identification expert.
  Analyze this plant image carefully and identify it.
  Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
  {
    "identified": true,
    "commonName": "Most common name",
    "scientificName": "Scientific binomial name",
    "family": "Plant family",
    "confidence": 90,
    "identificationDetails": "Brief explanation of identifying features you noticed",
    "alternatives": [
      {"commonName": "...", "scientificName": "...", "confidence": 80}
    ]
  }
  If the image is not a plant, set identified to false.`;

  const imagePart = { inlineData: { data: base64Image, mimeType } };
  const result = await model.generateContent([prompt, imagePart]);
  return parseJSON(result.response.text());
}

// ─── GENERATE CARE GUIDE ─────────────────────────────────────────────────────
export async function generateCareGuide(plantName, scientificName) {
  const model = getTextModel();
  const prompt = `You are an expert botanist and horticulturist. Generate a complete, detailed plant care guide for:
  Common Name: ${plantName}
  Scientific Name: ${scientificName}
  
  Return ONLY a valid JSON object (no markdown, no backticks, no extra text) with this exact structure:
  {
    "overview": "2-3 sentence description of the plant",
    "difficulty": "Beginner",
    "type": "Indoor",
    "lifespan": "Perennial",
    "nativeRegion": "Where it originates from",
    "soil": {
      "type": "Well-draining loamy soil",
      "ph": "6.0 - 7.0",
      "mix": "Specific mix recommendation",
      "tips": "Additional soil tips"
    },
    "watering": {
      "frequency": "Every 2-3 days in summer",
      "amount": "Water until it drains from bottom holes",
      "method": "Top watering",
      "overdoSigns": ["Yellow leaves", "Root rot"],
      "underdoSigns": ["Wilting", "Dry soil"],
      "tips": "Additional watering tips"
    },
    "sunlight": {
      "requirement": "Bright indirect light",
      "hoursPerDay": "6-8 hours",
      "indoorPlacement": "South-facing window",
      "tips": "Additional light tips"
    },
    "temperature": {
      "ideal": "18C - 27C",
      "minimum": "10C",
      "maximum": "38C",
      "humidity": "40-60%",
      "frostTolerant": false,
      "tips": "Temperature tips"
    },
    "fertilizer": {
      "type": "Balanced NPK 10-10-10",
      "frequency": "Every 2 weeks during growing season",
      "season": "Spring and Summer only",
      "organic": "Compost tea or banana peel water",
      "tips": "Additional fertilizer tips"
    },
    "potting": {
      "potSize": "6 inch pot to start",
      "material": "Terracotta",
      "repottingFrequency": "Every 1-2 years",
      "repottingSign": "Roots coming out of drainage holes",
      "tips": "Potting tips"
    },
    "pruning": {
      "needed": true,
      "frequency": "Monthly",
      "method": "Cut dead leaves at the base",
      "tips": "Pruning tips"
    },
    "propagation": {
      "methods": ["Stem cuttings", "Division"],
      "bestMethod": "Stem cuttings",
      "bestSeason": "Spring",
      "steps": ["Cut a healthy stem", "Place in water", "Wait for roots", "Transfer to soil"]
    },
    "commonProblems": [
      {
        "problem": "Yellow leaves",
        "symptoms": "Leaves turning yellow from bottom",
        "cause": "Overwatering",
        "solution": "Reduce watering frequency and check drainage"
      }
    ],
    "pests": [
      {
        "pest": "Spider mites",
        "symptoms": "Tiny webs on leaves",
        "treatment": "Spray with neem oil solution"
      }
    ],
    "growthTimeline": [
      {"period": "Week 1-2", "expectation": "Plant settles in new environment"},
      {"period": "Month 1", "expectation": "New growth appears"},
      {"period": "Month 3", "expectation": "Established root system"},
      {"period": "Month 6", "expectation": "Significant growth visible"},
      {"period": "Year 1", "expectation": "Fully established plant"}
    ],
    "companions": ["Plant 1", "Plant 2"],
    "toxicity": {
      "toxic": false,
      "toHumans": "Safe",
      "toPets": "Safe",
      "details": "No known toxicity"
    },
    "reminderSchedule": {
      "wateringDays": 3,
      "fertilizingDays": 14,
      "repottingMonths": 12
    }
  }`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

// ─── PLANT CHAT ──────────────────────────────────────────────────────────────
export async function chatWithPlantExpert(plantData, chatHistory, userMessage, daysSinceAdded) {
  const model = getTextModel();

  const systemContext = `You are an expert botanist and plant care advisor helping a user grow their ${plantData.plant_name} (${plantData.scientific_name || ''}).

PLANT CONTEXT:
- The user has been growing this plant for ${daysSinceAdded} days
- Care Guide: ${JSON.stringify(plantData.care_guide || {}, null, 2)}

GROWTH JOURNAL (recent entries):
${plantData.journal_entries ? plantData.journal_entries.map(e => `[${e.logged_at}]: ${e.note}`).join('\n') : 'No journal entries yet'}

INSTRUCTIONS:
- Give specific, actionable advice based on the plant care guide and growth duration
- Reference the care guide data when relevant
- If they mention symptoms, diagnose based on common problems in the care guide
- Keep responses helpful, concise, and encouraging
- Consider the ${daysSinceAdded} days of growth context in your answers`;

  const conversationHistory = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.message }]
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: `Understood! I am ready to help with your ${plantData.plant_name}. I will provide personalized advice based on its care requirements and your ${daysSinceAdded} days of growing experience.` }] },
      ...conversationHistory
    ]
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

// ─── REMINDER MESSAGE ────────────────────────────────────────────────────────
export async function generateReminderMessage(plantName, reminderType, daysSince) {
  const model = getTextModel();
  const prompt = `Write a short, friendly push notification (max 100 chars) reminding a user to ${reminderType} their ${plantName} plant. It has been ${daysSince} days. Be warm and encouraging. No quotes.`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
