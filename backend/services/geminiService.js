import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-2.0-flash-001 - stable, supports generateContent, no thinking mode
export const getTextModel = () => genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-001',
  generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
});

export const getVisionModel = () => genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-001',
  generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
});

// Safe JSON parser
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
    console.error('JSON parse failed. Raw response:', text.slice(0, 800));
    throw new Error('Failed to parse AI response as JSON');
  }
}

// IDENTIFY BY NAME
export async function identifyPlantByName(name) {
  const model = getTextModel();
  const prompt = `You are a professional botanist. A user typed "${name}" as a plant name.
Identify the exact plant and return ONLY this JSON (no extra text):
{
  "identified": true,
  "commonName": "Most common name",
  "scientificName": "Scientific binomial name",
  "family": "Plant family",
  "confidence": 95,
  "alternatives": [{"commonName": "Alt name", "scientificName": "Alt scientific", "description": "brief description"}],
  "note": "Clarification if ambiguous"
}
If not a plant, set identified to false.`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

// IDENTIFY BY IMAGE
export async function identifyPlantByImage(base64Image, mimeType = 'image/jpeg') {
  const model = getVisionModel();
  const prompt = `You are a botanist. Identify this plant image and return ONLY this JSON (no extra text):
{
  "identified": true,
  "commonName": "Most common name",
  "scientificName": "Scientific binomial name",
  "family": "Plant family",
  "confidence": 90,
  "identificationDetails": "Key identifying features",
  "alternatives": [{"commonName": "Alt name", "scientificName": "Alt scientific", "confidence": 75}]
}
If not a plant, set identified to false.`;

  const imagePart = { inlineData: { data: base64Image, mimeType } };
  const result = await model.generateContent([prompt, imagePart]);
  return parseJSON(result.response.text());
}

// GENERATE CARE GUIDE
export async function generateCareGuide(plantName, scientificName) {
  const model = getTextModel();
  const prompt = `Generate a complete plant care guide for ${plantName} (${scientificName}).
Return ONLY this JSON structure (no extra text, fill in real values):
{
  "overview": "Description here",
  "difficulty": "Beginner",
  "type": "Indoor",
  "lifespan": "Perennial",
  "nativeRegion": "Region here",
  "soil": {"type": "Soil type", "ph": "6.0-7.0", "mix": "Mix details", "tips": "Tips"},
  "watering": {"frequency": "Frequency", "amount": "Amount", "method": "Method", "overdoSigns": ["Sign1", "Sign2"], "underdoSigns": ["Sign1", "Sign2"], "tips": "Tips"},
  "sunlight": {"requirement": "Requirement", "hoursPerDay": "Hours", "indoorPlacement": "Placement", "tips": "Tips"},
  "temperature": {"ideal": "Range", "minimum": "Min", "maximum": "Max", "humidity": "Humidity", "frostTolerant": false, "tips": "Tips"},
  "fertilizer": {"type": "Type", "frequency": "Frequency", "season": "Season", "organic": "Organic option", "tips": "Tips"},
  "potting": {"potSize": "Size", "material": "Material", "repottingFrequency": "Frequency", "repottingSign": "Signs", "tips": "Tips"},
  "pruning": {"needed": true, "frequency": "Frequency", "method": "Method", "tips": "Tips"},
  "propagation": {"methods": ["Method1", "Method2"], "bestMethod": "Best", "bestSeason": "Season", "steps": ["Step1", "Step2", "Step3"]},
  "commonProblems": [{"problem": "Problem", "symptoms": "Symptoms", "cause": "Cause", "solution": "Solution"}],
  "pests": [{"pest": "Pest name", "symptoms": "Symptoms", "treatment": "Treatment"}],
  "growthTimeline": [
    {"period": "Week 1-2", "expectation": "Expectation"},
    {"period": "Month 1", "expectation": "Expectation"},
    {"period": "Month 3", "expectation": "Expectation"},
    {"period": "Month 6", "expectation": "Expectation"},
    {"period": "Year 1", "expectation": "Expectation"}
  ],
  "companions": ["Plant1", "Plant2"],
  "toxicity": {"toxic": false, "toHumans": "Safe", "toPets": "Safe", "details": "Details"},
  "reminderSchedule": {"wateringDays": 3, "fertilizingDays": 14, "repottingMonths": 12}
}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

// PLANT CHAT
export async function chatWithPlantExpert(plantData, chatHistory, userMessage, daysSinceAdded) {
  // Use non-JSON mode for chat
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

  const systemContext = `You are an expert botanist helping a user grow their ${plantData.plant_name} (${plantData.scientific_name || ''}).
The user has been growing this plant for ${daysSinceAdded} days.
Care Guide: ${JSON.stringify(plantData.care_guide || {})}
Recent journal: ${plantData.journal_entries ? plantData.journal_entries.map(e => `[${e.logged_at}]: ${e.note}`).join(', ') : 'None'}
Give specific, helpful, encouraging advice. Keep responses concise.`;

  const conversationHistory = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.message }]
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: `Ready to help with your ${plantData.plant_name}!` }] },
      ...conversationHistory
    ]
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

// REMINDER MESSAGE
export async function generateReminderMessage(plantName, reminderType, daysSince) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
  const prompt = `Write a short friendly push notification (max 100 chars) to remind user to ${reminderType} their ${plantName}. ${daysSince} days have passed. No quotes.`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
