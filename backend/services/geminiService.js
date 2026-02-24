import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getTextModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
export const getVisionModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function identifyPlantByName(name) {
  const model = getTextModel();
  const prompt = `You are a professional botanist. A user typed "${name}" as a plant name.
  Your tasks:
  1. Identify the exact plant they mean
  2. Return ONLY a valid JSON object (no markdown, no backticks)
  
  JSON format:
  {
    "identified": true or false,
    "commonName": "Most common name",
    "scientificName": "Scientific binomial name",
    "family": "Plant family",
    "confidence": 0-100,
    "alternatives": [
      {"commonName": "...", "scientificName": "...", "description": "brief 1-line description"}
    ],
    "note": "Any clarification note if name was ambiguous"
  }
  If the input is not a plant at all, set identified to false.`;

  const result = await model.generateContent(prompt);
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  
  // Strip markdown code blocks if present
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find JSON object boundaries in case there's extra text
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    text = text.slice(jsonStart, jsonEnd + 1);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse failed, raw text:', text.slice(0, 500));
    throw new Error('Failed to parse care guide from AI response');
  }
}

export async function identifyPlantByImage(base64Image, mimeType = 'image/jpeg') {
  const model = getVisionModel();
  const prompt = `You are a professional botanist and plant identification expert.
  Analyze this plant image carefully and identify it.
  Return ONLY a valid JSON object (no markdown, no backticks):
  {
    "identified": true or false,
    "commonName": "Most common name",
    "scientificName": "Scientific binomial name",
    "family": "Plant family",
    "confidence": 0-100,
    "identificationDetails": "Brief explanation of identifying features you noticed",
    "alternatives": [
      {"commonName": "...", "scientificName": "...", "confidence": 0-100}
    ]
  }
  If the image is not a plant, set identified to false.`;

  const imagePart = { inlineData: { data: base64Image, mimeType } };
  const result = await model.generateContent([prompt, imagePart]);
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  
  // Strip markdown code blocks if present
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find JSON object boundaries in case there's extra text
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    text = text.slice(jsonStart, jsonEnd + 1);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse failed, raw text:', text.slice(0, 500));
    throw new Error('Failed to parse care guide from AI response');
  }
}

export async function generateCareGuide(plantName, scientificName) {
  const model = getTextModel();
  const prompt = `You are an expert botanist and horticulturist. Generate a complete, detailed plant care guide for:
  Common Name: ${plantName}
  Scientific Name: ${scientificName}
  
  Return ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
  {
    "overview": "2-3 sentence description of the plant",
    "difficulty": "Beginner | Intermediate | Expert",
    "type": "Indoor | Outdoor | Both",
    "lifespan": "Annual | Biennial | Perennial",
    "nativeRegion": "Where it originates from",
    "soil": {
      "type": "e.g. Well-draining loamy soil",
      "ph": "e.g. 6.0 - 7.0",
      "mix": "Specific mix recommendation",
      "tips": "Additional soil tips"
    },
    "watering": {
      "frequency": "e.g. Every 2-3 days in summer",
      "amount": "e.g. Water until it drains from bottom holes",
      "method": "Top watering / Bottom watering / Misting",
      "overdoSigns": ["Sign 1", "Sign 2"],
      "underdoSigns": ["Sign 1", "Sign 2"],
      "tips": "Additional watering tips"
    },
    "sunlight": {
      "requirement": "Full sun | Partial shade | Full shade | Bright indirect",
      "hoursPerDay": "e.g. 6-8 hours",
      "indoorPlacement": "e.g. South-facing window",
      "tips": "Additional light tips"
    },
    "temperature": {
      "ideal": "e.g. 18C - 27C",
      "minimum": "e.g. 10C",
      "maximum": "e.g. 38C",
      "humidity": "e.g. 40-60%",
      "frostTolerant": true,
      "tips": "Temperature tips"
    },
    "fertilizer": {
      "type": "e.g. Balanced NPK 10-10-10",
      "frequency": "e.g. Every 2 weeks during growing season",
      "season": "When to fertilize and when to stop",
      "organic": "Organic alternatives",
      "tips": "Additional fertilizer tips"
    },
    "potting": {
      "potSize": "Starting pot size recommendation",
      "material": "Terracotta / Plastic / Ceramic",
      "repottingFrequency": "How often to repot",
      "repottingSign": "Signs it needs repotting",
      "tips": "Potting tips"
    },
    "pruning": {
      "needed": true,
      "frequency": "How often",
      "method": "How to prune",
      "tips": "Pruning tips"
    },
    "propagation": {
      "methods": ["Method 1", "Method 2"],
      "bestMethod": "Easiest method for beginners",
      "bestSeason": "Best time of year to propagate",
      "steps": ["Step 1", "Step 2", "Step 3"]
    },
    "commonProblems": [
      {
        "problem": "Problem name",
        "symptoms": "What to look for",
        "cause": "What causes it",
        "solution": "How to fix it"
      }
    ],
    "pests": [
      {
        "pest": "Pest name",
        "symptoms": "What to look for",
        "treatment": "How to treat"
      }
    ],
    "growthTimeline": [
      {"period": "Week 1-2", "expectation": "What to expect"},
      {"period": "Month 1", "expectation": "What to expect"},
      {"period": "Month 3", "expectation": "What to expect"},
      {"period": "Month 6", "expectation": "What to expect"},
      {"period": "Year 1", "expectation": "What to expect"}
    ],
    "companions": ["Plant 1", "Plant 2"],
    "toxicity": {
      "toxic": false,
      "toHumans": "Safe / Mildly toxic / Toxic",
      "toPets": "Safe / Mildly toxic / Toxic",
      "details": "Toxicity details if any"
    },
    "reminderSchedule": {
      "wateringDays": 3,
      "fertilizingDays": 14,
      "repottingMonths": 12
    }
  }`;

  const result = await model.generateContent(prompt);
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  
  // Strip markdown code blocks if present
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find JSON object boundaries in case there's extra text
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    text = text.slice(jsonStart, jsonEnd + 1);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse failed, raw text:', text.slice(0, 500));
    throw new Error('Failed to parse care guide from AI response');
  }

export async function chatWithPlantExpert(plantData, chatHistory, userMessage, daysSinceAdded) {
  const model = getTextModel();

  const systemContext = `You are an expert botanist and plant care advisor helping a user grow their ${plantData.plant_name} (${plantData.scientific_name || ''}).

PLANT CONTEXT:
- The user has been growing this plant for ${daysSinceAdded} days
- Care Guide Summary: ${JSON.stringify(plantData.care_guide || {}, null, 2)}

GROWTH JOURNAL (recent entries):
${plantData.journal_entries ? plantData.journal_entries.map(e => `[${e.logged_at}]: ${e.note}`).join('\n') : 'No journal entries yet'}

INSTRUCTIONS:
- Give specific, actionable advice based on the plant care guide and growth duration
- Reference the care guide data when relevant
- If they mention symptoms, diagnose based on the care guide common problems section
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

export async function generateReminderMessage(plantName, reminderType, daysSince) {
  const model = getTextModel();
  const prompt = `Write a short, friendly push notification (max 100 chars) reminding a user to ${reminderType} their ${plantName} plant. It has been ${daysSince} days. Be warm and encouraging. No quotes.`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
