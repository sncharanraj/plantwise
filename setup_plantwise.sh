#!/bin/bash

echo ""
echo "============================================"
echo "   PlantWise - Project Setup Script (WSL)"
echo "============================================"
echo ""

# ─── CREATE FOLDERS ──────────────────────────────────────────────────────────
mkdir -p backend/routes
mkdir -p backend/services
mkdir -p frontend/public
mkdir -p frontend/src/pages
mkdir -p frontend/src/components
mkdir -p frontend/src/context
mkdir -p frontend/src/lib

echo "[1/27] Folders created..."

# ─── BACKEND: package.json ───────────────────────────────────────────────────
cat > backend/package.json << 'EOF'
{
  "name": "plantapp-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@supabase/supabase-js": "^2.45.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.3",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  }
}
EOF
echo "[2/27] backend/package.json created..."

# ─── BACKEND: index.js ───────────────────────────────────────────────────────
cat > backend/index.js << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import identifyRoutes from './routes/identify.js';
import careGuideRoutes from './routes/careGuide.js';
import chatRoutes from './routes/chat.js';
import plantsRoutes from './routes/plants.js';
import journalRoutes from './routes/journal.js';
import notificationRoutes from './routes/notifications.js';
import { sendWateringReminders } from './services/notificationService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/identify', identifyRoutes);
app.use('/api/care-guide', careGuideRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/plants', plantsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

cron.schedule('0 8 * * *', async () => {
  console.log('Running daily reminder cron job...');
  await sendWateringReminders();
});

app.listen(PORT, () => {
  console.log(`🌱 Plant App Backend running on port ${PORT}`);
});
EOF
echo "[3/27] backend/index.js created..."

# ─── BACKEND: services/geminiService.js ──────────────────────────────────────
cat > backend/services/geminiService.js << 'EOF'
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getTextModel = () => genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
export const getVisionModel = () => genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
  const text = result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim();
  return JSON.parse(text);
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
  const text = result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim();
  return JSON.parse(text);
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
  const text = result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim();
  return JSON.parse(text);
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
EOF
echo "[4/27] backend/services/geminiService.js created..."

# ─── BACKEND: services/supabaseService.js ────────────────────────────────────
cat > backend/services/supabaseService.js << 'EOF'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default supabase;
EOF
echo "[5/27] backend/services/supabaseService.js created..."

# ─── BACKEND: services/notificationService.js ────────────────────────────────
cat > backend/services/notificationService.js << 'EOF'
import supabase from './supabaseService.js';

export async function sendWateringReminders() {
  try {
    const { data: plants } = await supabase
      .from('user_plants')
      .select('id, user_id, plant_name, care_guide, created_at');

    if (!plants?.length) return;

    const notifications = [];

    for (const plant of plants) {
      if (!plant.care_guide?.reminderSchedule) continue;

      const { wateringDays, fertilizingDays, repottingMonths } = plant.care_guide.reminderSchedule;
      const daysSinceAdded = Math.floor((new Date() - new Date(plant.created_at)) / (1000 * 60 * 60 * 24));

      const { data: lastWater } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('plant_id', plant.id)
        .eq('type', 'watering')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const daysSinceLastWater = lastWater
        ? Math.floor((new Date() - new Date(lastWater.created_at)) / (1000 * 60 * 60 * 24))
        : wateringDays + 1;

      if (daysSinceLastWater >= wateringDays) {
        notifications.push({
          user_id: plant.user_id,
          plant_id: plant.id,
          type: 'watering',
          message: `Water your ${plant.plant_name}! It has been ${daysSinceLastWater} days.`
        });
      }

      const { data: lastFert } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('plant_id', plant.id)
        .eq('type', 'fertilizing')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const daysSinceLastFert = lastFert
        ? Math.floor((new Date() - new Date(lastFert.created_at)) / (1000 * 60 * 60 * 24))
        : fertilizingDays + 1;

      if (daysSinceLastFert >= fertilizingDays) {
        notifications.push({
          user_id: plant.user_id,
          plant_id: plant.id,
          type: 'fertilizing',
          message: `Your ${plant.plant_name} needs fertilizing! Keep it thriving.`
        });
      }

      if (repottingMonths && daysSinceAdded % (repottingMonths * 30) < 1) {
        notifications.push({
          user_id: plant.user_id,
          plant_id: plant.id,
          type: 'repotting',
          message: `Consider repotting your ${plant.plant_name} - it may be getting root-bound!`
        });
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
      console.log(`Created ${notifications.length} reminder notifications`);
    }
  } catch (err) {
    console.error('Reminder cron error:', err);
  }
}
EOF
echo "[6/27] backend/services/notificationService.js created..."

# ─── BACKEND: routes/identify.js ─────────────────────────────────────────────
cat > backend/routes/identify.js << 'EOF'
import express from 'express';
import { identifyPlantByName, identifyPlantByImage } from '../services/geminiService.js';

const router = express.Router();

router.post('/by-name', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Plant name is required' });
    const result = await identifyPlantByName(name);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Identify by name error:', err);
    res.status(500).json({ error: 'Failed to identify plant', details: err.message });
  }
});

router.post('/by-image', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'Image data is required' });
    const result = await identifyPlantByImage(image, mimeType || 'image/jpeg');
    res.json({ success: true, data: result, source: 'gemini' });
  } catch (err) {
    console.error('Identify by image error:', err);
    res.status(500).json({ error: 'Failed to identify plant from image', details: err.message });
  }
});

export default router;
EOF
echo "[7/27] backend/routes/identify.js created..."

# ─── BACKEND: routes/careGuide.js ────────────────────────────────────────────
cat > backend/routes/careGuide.js << 'EOF'
import express from 'express';
import { generateCareGuide } from '../services/geminiService.js';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { plantName, scientificName, plantId } = req.body;
    if (!plantName) return res.status(400).json({ error: 'plantName is required' });

    if (plantId) {
      const { data: existing } = await supabase
        .from('user_plants')
        .select('care_guide')
        .eq('id', plantId)
        .single();
      if (existing?.care_guide) {
        return res.json({ success: true, data: existing.care_guide, cached: true });
      }
    }

    const careGuide = await generateCareGuide(plantName, scientificName || plantName);

    if (plantId) {
      await supabase.from('user_plants').update({ care_guide: careGuide }).eq('id', plantId);
    }

    res.json({ success: true, data: careGuide, cached: false });
  } catch (err) {
    console.error('Care guide error:', err);
    res.status(500).json({ error: 'Failed to generate care guide', details: err.message });
  }
});

export default router;
EOF
echo "[8/27] backend/routes/careGuide.js created..."

# ─── BACKEND: routes/chat.js ─────────────────────────────────────────────────
cat > backend/routes/chat.js << 'EOF'
import express from 'express';
import { chatWithPlantExpert } from '../services/geminiService.js';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.post('/:plantId/message', async (req, res) => {
  try {
    const { plantId } = req.params;
    const { message, userId } = req.body;
    if (!message || !userId) return res.status(400).json({ error: 'message and userId are required' });

    const { data: plant, error: plantError } = await supabase
      .from('user_plants').select('*').eq('id', plantId).single();
    if (plantError || !plant) return res.status(404).json({ error: 'Plant not found' });

    const { data: chatHistory } = await supabase
      .from('plant_chats').select('role, message, created_at')
      .eq('plant_id', plantId).order('created_at', { ascending: true }).limit(20);

    const { data: journalEntries } = await supabase
      .from('growth_logs').select('note, logged_at')
      .eq('plant_id', plantId).order('logged_at', { ascending: false }).limit(5);

    const daysSinceAdded = Math.floor((new Date() - new Date(plant.created_at)) / (1000 * 60 * 60 * 24));
    const plantDataWithJournal = { ...plant, journal_entries: journalEntries || [] };

    const aiResponse = await chatWithPlantExpert(plantDataWithJournal, chatHistory || [], message, daysSinceAdded);

    await supabase.from('plant_chats').insert({ plant_id: plantId, user_id: userId, role: 'user', message });
    await supabase.from('plant_chats').insert({ plant_id: plantId, user_id: userId, role: 'assistant', message: aiResponse });

    res.json({ success: true, response: aiResponse, daysSinceAdded });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

router.get('/:plantId/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plant_chats').select('*').eq('plant_id', req.params.plantId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.delete('/:plantId/history', async (req, res) => {
  try {
    await supabase.from('plant_chats').delete().eq('plant_id', req.params.plantId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
EOF
echo "[9/27] backend/routes/chat.js created..."

# ─── BACKEND: routes/plants.js ───────────────────────────────────────────────
cat > backend/routes/plants.js << 'EOF'
import express from 'express';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.get('/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_plants').select('id, plant_name, scientific_name, family, image_url, difficulty, identified_via, created_at')
      .eq('user_id', req.params.userId).order('created_at', { ascending: false });
    if (error) throw error;
    const plantsWithDays = (data || []).map(plant => ({
      ...plant,
      days_growing: Math.floor((new Date() - new Date(plant.created_at)) / (1000 * 60 * 60 * 24))
    }));
    res.json({ success: true, data: plantsWithDays });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

router.get('/:plantId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_plants').select('*').eq('id', req.params.plantId).single();
    if (error || !data) return res.status(404).json({ error: 'Plant not found' });
    data.days_growing = Math.floor((new Date() - new Date(data.created_at)) / (1000 * 60 * 60 * 24));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plant' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, plantName, scientificName, family, imageUrl, difficulty, identifiedVia } = req.body;
    if (!userId || !plantName) return res.status(400).json({ error: 'userId and plantName are required' });
    const { data, error } = await supabase
      .from('user_plants')
      .insert({ user_id: userId, plant_name: plantName, scientific_name: scientificName, family, image_url: imageUrl, difficulty, identified_via: identifiedVia || 'name' })
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Add plant error:', err);
    res.status(500).json({ error: 'Failed to add plant', details: err.message });
  }
});

router.patch('/:plantId', async (req, res) => {
  try {
    const updates = req.body;
    delete updates.user_id;
    const { data, error } = await supabase
      .from('user_plants').update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.plantId).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plant' });
  }
});

router.delete('/:plantId', async (req, res) => {
  try {
    const { error } = await supabase.from('user_plants').delete().eq('id', req.params.plantId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});

export default router;
EOF
echo "[10/27] backend/routes/plants.js created..."

# ─── BACKEND: routes/journal.js ──────────────────────────────────────────────
cat > backend/routes/journal.js << 'EOF'
import express from 'express';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.get('/:plantId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('growth_logs').select('*').eq('plant_id', req.params.plantId).order('logged_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { plantId, userId, note, imageBase64, imageMimeType } = req.body;
    if (!plantId || !userId) return res.status(400).json({ error: 'plantId and userId required' });

    let imageUrl = null;
    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `journals/${plantId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('plant-images').upload(filename, buffer, { contentType: imageMimeType || 'image/jpeg', upsert: false });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('plant-images').getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from('growth_logs').insert({ plant_id: plantId, user_id: userId, note, image_url: imageUrl }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Journal error:', err);
    res.status(500).json({ error: 'Failed to add journal entry', details: err.message });
  }
});

router.delete('/:entryId', async (req, res) => {
  try {
    await supabase.from('growth_logs').delete().eq('id', req.params.entryId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
EOF
echo "[11/27] backend/routes/journal.js created..."

# ─── BACKEND: routes/notifications.js ────────────────────────────────────────
cat > backend/routes/notifications.js << 'EOF'
import express from 'express';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.get('/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications').select('*, user_plants(plant_name)')
      .eq('user_id', req.params.userId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:notifId/read', async (req, res) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', req.params.notifId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.patch('/user/:userId/read-all', async (req, res) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
EOF
echo "[12/27] backend/routes/notifications.js created..."

# ─── FRONTEND: package.json ───────────────────────────────────────────────────
cat > frontend/package.json << 'EOF'
{
  "name": "plantapp-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
EOF
echo "[13/27] frontend/package.json created..."

# ─── FRONTEND: public/index.html ─────────────────────────────────────────────
cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <meta name="theme-color" content="#1a2e1a" />
    <meta name="description" content="Grow smarter with AI-powered plant care" />
    <title>PlantWise — Grow Smarter</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF
echo "[14/27] frontend/public/index.html created..."

# ─── FRONTEND: src/index.js ───────────────────────────────────────────────────
cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
EOF
echo "[15/27] frontend/src/index.js created..."

# ─── FRONTEND: src/index.css ─────────────────────────────────────────────────
cat > frontend/src/index.css << 'EOF'
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
:root {
  --forest: #1a2e1a; --moss: #2d4a2d; --sage: #4a7c59; --mint: #7fb896;
  --cream: #f5f0e8; --sand: #e8dcc8; --warm-white: #faf8f4;
  --text-dark: #1a1a18; --text-mid: #4a4a42; --text-light: #8a8a7e;
  --accent: #c4973c; --danger: #c0392b; --success: #27ae60;
  --border: rgba(74, 124, 89, 0.15); --shadow: 0 4px 24px rgba(26, 46, 26, 0.12);
  --radius: 16px; --radius-sm: 10px;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
html { scroll-behavior: smooth; }
body { font-family: var(--font-body); background: var(--warm-white); color: var(--text-dark); min-height: 100vh; overflow-x: hidden; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--mint); border-radius: 3px; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes growIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fadeUp { animation: fadeUp 0.5s ease forwards; }
.animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
.animate-growIn { animation: growIn 0.4s ease forwards; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-pulse { animation: pulse 2s ease infinite; }
.card { background: white; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 100px; font-family: var(--font-body); font-size: 15px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s ease; text-decoration: none; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: var(--forest); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--moss); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(26,46,26,0.25); }
.btn-secondary { background: var(--cream); color: var(--forest); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--sand); }
.btn-ghost { background: transparent; color: var(--sage); }
.btn-ghost:hover:not(:disabled) { background: rgba(74,124,89,0.08); }
.btn-sm { padding: 8px 16px; font-size: 13px; }
.btn-lg { padding: 16px 32px; font-size: 16px; }
.input { width: 100%; padding: 14px 18px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 15px; background: white; color: var(--text-dark); transition: all 0.2s; outline: none; }
.input:focus { border-color: var(--sage); box-shadow: 0 0 0 3px rgba(74,124,89,0.1); }
.input::placeholder { color: var(--text-light); }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 500; }
.badge-green { background: rgba(127,184,150,0.2); color: var(--sage); }
.badge-amber { background: rgba(196,151,60,0.15); color: var(--accent); }
.badge-red { background: rgba(192,57,43,0.1); color: var(--danger); }
.spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner-dark { border-color: rgba(26,46,26,0.2); border-top-color: var(--forest); }
EOF
echo "[16/27] frontend/src/index.css created..."

# ─── FRONTEND: src/App.js ─────────────────────────────────────────────────────
cat > frontend/src/App.js << 'EOF'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PlantDetail from './pages/PlantDetail';
import './index.css';

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 20 }}>
        <span style={{ fontSize: 48 }}>🌱</span>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(74,124,89,0.2)', borderTopColor: 'var(--sage)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
      <Route path="/plant/:plantId" element={user ? <PlantDetail /> : <Navigate to="/auth" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
EOF
echo "[17/27] frontend/src/App.js created..."

# ─── FRONTEND: src/lib/supabase.js ───────────────────────────────────────────
cat > frontend/src/lib/supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
EOF
echo "[18/27] frontend/src/lib/supabase.js created..."

# ─── FRONTEND: src/lib/api.js ─────────────────────────────────────────────────
cat > frontend/src/lib/api.js << 'EOF'
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const identifyByName = (name) => request('/identify/by-name', { method: 'POST', body: JSON.stringify({ name }) });
export const identifyByImage = (image, mimeType) => request('/identify/by-image', { method: 'POST', body: JSON.stringify({ image, mimeType }) });
export const generateCareGuide = (plantName, scientificName, plantId) => request('/care-guide/generate', { method: 'POST', body: JSON.stringify({ plantName, scientificName, plantId }) });
export const getUserPlants = (userId) => request(`/plants/user/${userId}`);
export const getPlant = (plantId) => request(`/plants/${plantId}`);
export const addPlant = (plantData) => request('/plants', { method: 'POST', body: JSON.stringify(plantData) });
export const deletePlant = (plantId) => request(`/plants/${plantId}`, { method: 'DELETE' });
export const updatePlant = (plantId, updates) => request(`/plants/${plantId}`, { method: 'PATCH', body: JSON.stringify(updates) });
export const sendChatMessage = (plantId, message, userId) => request(`/chat/${plantId}/message`, { method: 'POST', body: JSON.stringify({ message, userId }) });
export const getChatHistory = (plantId) => request(`/chat/${plantId}/history`);
export const getJournal = (plantId) => request(`/journal/${plantId}`);
export const addJournalEntry = (entry) => request('/journal', { method: 'POST', body: JSON.stringify(entry) });
export const deleteJournalEntry = (entryId) => request(`/journal/${entryId}`, { method: 'DELETE' });
export const getNotifications = (userId) => request(`/notifications/user/${userId}`);
export const markNotificationRead = (notifId) => request(`/notifications/${notifId}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = (userId) => request(`/notifications/user/${userId}/read-all`, { method: 'PATCH' });

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
EOF
echo "[19/27] frontend/src/lib/api.js created..."

# ─── FRONTEND: src/context/AuthContext.js ────────────────────────────────────
cat > frontend/src/context/AuthContext.js << 'EOF'
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google' });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
EOF
echo "[20/27] frontend/src/context/AuthContext.js created..."

# ─── FRONTEND: src/pages/AuthPage.js ─────────────────────────────────────────
cat > frontend/src/pages/AuthPage.js << 'EOF'
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess('Account created! Please check your email to confirm.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.container}>
      <div style={s.left}>
        <div style={s.brand}>
          <span style={s.logo}>🌿</span>
          <h1 style={s.title}>PlantWise</h1>
          <p style={s.tagline}>Grow smarter,{'\n'}not harder.</p>
          {['AI-powered plant identification','Complete care guides','Persistent follow-up chat','Growth journal & reminders'].map((f,i)=>(
            <div key={i} style={s.feature}><span style={s.dot}/><span>{f}</span></div>
          ))}
        </div>
      </div>
      <div style={s.right}>
        <div style={s.card} className="animate-growIn">
          <h2 style={s.formTitle}>{mode==='login'?'Welcome back':'Start growing'}</h2>
          <p style={s.sub}>{mode==='login'?'Sign in to your garden':'Create your free account'}</p>
          {error && <div style={s.err}>{error}</div>}
          {success && <div style={s.suc}>{success}</div>}
          <form onSubmit={handleSubmit} style={s.form}>
            <input className="input" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required style={{marginBottom:12}}/>
            <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} style={{marginBottom:20}}/>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{width:'100%'}}>
              {loading?<span className="spinner"/>:null}{mode==='login'?'Sign In':'Create Account'}
            </button>
          </form>
          <div style={s.div}><span style={s.line}/><span style={s.or}>or</span><span style={s.line}/></div>
          <button className="btn btn-secondary" onClick={signInWithGoogle} style={{width:'100%',marginBottom:24}}>
            Continue with Google
          </button>
          <p style={s.sw}>{mode==='login'?"Don't have an account? ":"Already have an account? "}
            <button style={s.swb} onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>
              {mode==='login'?'Sign up free':'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  container:{display:'flex',minHeight:'100vh'},
  left:{flex:1,background:'linear-gradient(135deg,#1a2e1a,#2d4a2d)',display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 40px'},
  brand:{color:'white',maxWidth:400},
  logo:{fontSize:56,display:'block',marginBottom:20},
  title:{fontFamily:'var(--font-display)',fontSize:48,fontWeight:400,marginBottom:16},
  tagline:{fontFamily:'var(--font-display)',fontSize:28,fontStyle:'italic',opacity:0.85,marginBottom:40,lineHeight:1.4,whiteSpace:'pre-line'},
  feature:{display:'flex',alignItems:'center',gap:12,opacity:0.9,fontSize:16,marginBottom:12},
  dot:{width:8,height:8,borderRadius:'50%',background:'#7fb896',flexShrink:0},
  right:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 24px',background:'var(--warm-white)'},
  card:{background:'white',borderRadius:24,padding:'40px 36px',width:'100%',maxWidth:420,boxShadow:'0 24px 64px rgba(26,46,26,0.12)',border:'1px solid var(--border)'},
  formTitle:{fontFamily:'var(--font-display)',fontSize:32,fontWeight:600,marginBottom:8},
  sub:{color:'var(--text-light)',marginBottom:28,fontSize:15},
  form:{display:'flex',flexDirection:'column'},
  err:{background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.2)',borderRadius:10,padding:'12px 16px',marginBottom:20,color:'var(--danger)',fontSize:14},
  suc:{background:'rgba(39,174,96,0.08)',border:'1px solid rgba(39,174,96,0.2)',borderRadius:10,padding:'12px 16px',marginBottom:20,color:'var(--success)',fontSize:14},
  div:{display:'flex',alignItems:'center',gap:12,margin:'20px 0'},
  line:{flex:1,height:1,background:'var(--border)'},
  or:{color:'var(--text-light)',fontSize:13},
  sw:{textAlign:'center',color:'var(--text-mid)',fontSize:14},
  swb:{background:'none',border:'none',color:'var(--sage)',fontWeight:600,cursor:'pointer',fontSize:14,textDecoration:'underline'}
};
EOF
echo "[21/27] frontend/src/pages/AuthPage.js created..."

# ─── FRONTEND: src/components/NotificationPanel.js ───────────────────────────
cat > frontend/src/components/NotificationPanel.js << 'EOF'
import { markNotificationRead } from '../lib/api';

export default function NotificationPanel({ notifications, userId, onClose, onMarkAllRead }) {
  const icon = { watering:'💧', fertilizing:'🌿', repotting:'🪴' };
  return (
    <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={s.panel} className="animate-growIn">
        <div style={s.hdr}>
          <h2 style={s.ttl}>Reminders</h2>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            {notifications.length>0&&<button className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>Mark all read</button>}
            <button style={s.cls} onClick={onClose}>✕</button>
          </div>
        </div>
        {notifications.length===0?(
          <div style={s.empty}><p style={{fontSize:36,marginBottom:12}}>✅</p><p style={{color:'var(--text-light)'}}>All caught up!</p></div>
        ):(
          <div style={s.list}>
            {notifications.map(n=>(
              <div key={n.id} style={s.item}>
                <span style={s.ico}>{icon[n.type]||'🔔'}</span>
                <div style={{flex:1}}>
                  <p style={s.msg}>{n.message}</p>
                  <p style={s.time}>{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
                <button style={s.rb} onClick={()=>markNotificationRead(n.id)}>✓</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',padding:'70px 20px 20px'},
  panel:{background:'white',borderRadius:20,width:'100%',maxWidth:380,maxHeight:'70vh',overflow:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.15)',border:'1px solid var(--border)'},
  hdr:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid var(--border)'},
  ttl:{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600},
  cls:{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-light)'},
  empty:{textAlign:'center',padding:'40px 24px'},
  list:{padding:'12px 0'},
  item:{display:'flex',gap:14,padding:'14px 24px',borderBottom:'1px solid rgba(0,0,0,0.04)',alignItems:'flex-start'},
  ico:{fontSize:24,flexShrink:0},
  msg:{fontSize:14,color:'var(--text-dark)',lineHeight:1.5,marginBottom:4},
  time:{fontSize:12,color:'var(--text-light)'},
  rb:{background:'var(--cream)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',color:'var(--sage)',fontWeight:700,flexShrink:0}
};
EOF
echo "[22/27] frontend/src/components/NotificationPanel.js created..."

# ─── FRONTEND: src/components/AddPlantModal.js ───────────────────────────────
cat > frontend/src/components/AddPlantModal.js << 'EOF'
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
EOF
echo "[23/27] frontend/src/components/AddPlantModal.js created..."

# ─── FRONTEND: src/pages/Dashboard.js ────────────────────────────────────────
cat > frontend/src/pages/Dashboard.js << 'EOF'
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserPlants, getNotifications, markAllNotificationsRead } from '../lib/api';
import AddPlantModal from '../components/AddPlantModal';
import NotificationPanel from '../components/NotificationPanel';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (user) { fetchPlants(); fetchNotifs(); } }, [user]);

  async function fetchPlants() {
    try { const r = await getUserPlants(user.id); setPlants(r.data||[]); }
    catch(e){} finally { setLoading(false); }
  }
  async function fetchNotifs() {
    try { const r = await getNotifications(user.id); setNotifications((r.data||[]).filter(n=>!n.read)); }
    catch(e){}
  }
  function onPlantAdded(p) { setPlants(prev=>[p,...prev]); setShowAdd(false); navigate(`/plant/${p.id}`); }

  const filtered = plants.filter(p=>p.plant_name.toLowerCase().includes(search.toLowerCase())||(p.scientific_name||'').toLowerCase().includes(search.toLowerCase()));
  const dc = {Beginner:'badge-green',Intermediate:'badge-amber',Expert:'badge-red'};

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.nl}><span style={s.nlo}>🌿</span><span style={s.nb}>PlantWise</span></div>
        <div style={s.nr}>
          <button style={s.nb2} onClick={()=>setShowNotifs(true)}>
            🔔{notifications.length>0&&<span style={s.nbdg}>{notifications.length}</span>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </nav>
      <div style={s.content}>
        <div style={s.hdr} className="animate-fadeUp">
          <div>
            <h1 style={s.ttl}><span style={{fontFamily:'var(--font-display)',fontStyle:'italic'}}>My</span> Garden</h1>
            <p style={s.sub}>{plants.length===0?'Start by adding your first plant':`You're growing ${plants.length} plant${plants.length!==1?'s':''}`}</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Plant</button>
        </div>
        {plants.length>0&&(
          <div style={s.sw} className="animate-fadeUp">
            <input className="input" placeholder="Search your plants..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:400}}/>
          </div>
        )}
        {loading?(
          <div style={s.ls}><div className="spinner spinner-dark" style={{width:32,height:32}}/><p style={{color:'var(--text-light)',marginTop:16}}>Loading your garden...</p></div>
        ):filtered.length===0&&plants.length===0?(
          <div style={s.es} className="animate-fadeUp">
            <div style={{fontSize:72,marginBottom:24}}>🌱</div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:28,marginBottom:12}}>Your garden is empty</h2>
            <p style={{color:'var(--text-light)',maxWidth:360,lineHeight:1.6,marginBottom:32}}>Identify a plant by name or photo and get a complete AI-powered care guide.</p>
            <button className="btn btn-primary btn-lg" onClick={()=>setShowAdd(true)}>+ Add your first plant</button>
          </div>
        ):(
          <div style={s.grid}>
            {filtered.map((p,i)=>(
              <div key={p.id} className="card animate-fadeUp" style={{...s.card,animationDelay:`${i*0.06}s`,cursor:'pointer'}} onClick={()=>navigate(`/plant/${p.id}`)}>
                <div style={s.ci}>
                  {p.image_url?<img src={p.image_url} alt={p.plant_name} style={s.img}/>:<div style={s.ph}><span style={{fontSize:48}}>🌿</span></div>}
                  <div style={s.ov}/>
                  {p.difficulty&&<span className={`badge ${dc[p.difficulty]||'badge-green'}`} style={s.db}>{p.difficulty}</span>}
                </div>
                <div style={s.ci2}>
                  <h3 style={s.pn}>{p.plant_name}</h3>
                  {p.scientific_name&&<p style={s.sn}>{p.scientific_name}</p>}
                  <p style={s.dg}>🗓 {p.days_growing} days growing</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={s.bnav}>
        <button style={s.bb} onClick={()=>navigate('/')}><span>🏡</span><span style={s.bl}>Garden</span></button>
        <button style={{...s.bb,...s.ab}} onClick={()=>setShowAdd(true)}><span style={s.ai}>+</span></button>
        <button style={s.bb}><span>⚙️</span><span style={s.bl}>Settings</span></button>
      </div>
      {showAdd&&<AddPlantModal userId={user.id} onClose={()=>setShowAdd(false)} onPlantAdded={onPlantAdded}/>}
      {showNotifs&&<NotificationPanel notifications={notifications} userId={user.id} onClose={()=>setShowNotifs(false)} onMarkAllRead={()=>{markAllNotificationsRead(user.id);setNotifications([]);}}/>}
    </div>
  );
}

const s = {
  page:{minHeight:'100vh',background:'var(--warm-white)',paddingBottom:90},
  nav:{position:'sticky',top:0,zIndex:100,background:'rgba(250,248,244,0.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'0 24px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'},
  nl:{display:'flex',alignItems:'center',gap:10},
  nlo:{fontSize:24},
  nb:{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--forest)'},
  nr:{display:'flex',alignItems:'center',gap:12},
  nb2:{background:'none',border:'none',cursor:'pointer',fontSize:20,position:'relative',padding:4},
  nbdg:{position:'absolute',top:0,right:0,background:'#e74c3c',color:'white',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  content:{maxWidth:1200,margin:'0 auto',padding:'32px 24px'},
  hdr:{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:16},
  ttl:{fontSize:36,fontWeight:600,color:'var(--text-dark)',lineHeight:1.2},
  sub:{color:'var(--text-light)',fontSize:15,marginTop:4},
  sw:{marginBottom:24},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:20},
  card:{overflow:'hidden',transition:'all 0.25s ease'},
  ci:{position:'relative',height:180,overflow:'hidden',background:'linear-gradient(135deg,#e8f5e9,#c8e6c9)'},
  img:{width:'100%',height:'100%',objectFit:'cover'},
  ph:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,rgba(127,184,150,0.2),rgba(74,124,89,0.1))'},
  ov:{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.2),transparent)'},
  db:{position:'absolute',top:12,right:12},
  ci2:{padding:'16px 20px'},
  pn:{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,marginBottom:4},
  sn:{fontSize:13,fontStyle:'italic',color:'var(--text-light)',marginBottom:8},
  dg:{fontSize:13,color:'var(--text-mid)'},
  ls:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80},
  es:{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'80px 24px'},
  bnav:{position:'fixed',bottom:0,left:0,right:0,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderTop:'1px solid var(--border)',padding:'8px 24px 16px',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:100},
  bb:{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:22,padding:'8px 20px',borderRadius:12},
  bl:{fontSize:11,color:'var(--text-light)'},
  ab:{background:'var(--forest)',borderRadius:'50%',width:52,height:52,padding:0},
  ai:{fontSize:28,color:'white',lineHeight:1}
};
EOF
echo "[24/27] frontend/src/pages/Dashboard.js created..."

# ─── FRONTEND: src/pages/PlantDetail.js ──────────────────────────────────────
cat > frontend/src/pages/PlantDetail.js << 'EOF'
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
EOF
echo "[25/27] frontend/src/pages/PlantDetail.js created..."

# ─── README ───────────────────────────────────────────────────────────────────
cat > README.md << 'EOF'
# PlantWise - AI Plant Care App

## Quick Start

### 1. Backend
cd backend && npm install && npm run dev

### 2. Frontend (new terminal)
cd frontend && npm install && npm start

App runs at: http://localhost:3000
API runs at: http://localhost:5000

## Keys needed
- GEMINI_API_KEY → aistudio.google.com (free)
- SUPABASE_URL + keys → supabase.com (free)
EOF
echo "[26/27] README.md created..."

echo ""
echo "[27/27] All done!"
echo ""
echo "============================================"
echo "   SUCCESS! Project setup complete!"
echo "============================================"
echo ""
echo "Your project structure:"
echo ""
find . -not -path '*/.git/*' -not -name '.env' | sort | sed 's|[^/]*/|  |g;s|  \([^/]*\)$|  └── \1|'
echo ""
echo "NEXT STEPS:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    npm install"
echo "    npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm install"
echo "    npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
