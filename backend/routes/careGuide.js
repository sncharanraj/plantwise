import express from 'express';
import { generateCareGuide } from '../services/geminiService.js';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { plantName, scientificName, plantId, lang = 'en' } = req.body;
    if (!plantName) return res.status(400).json({ error: 'plantName is required' });

    const careGuide = await generateCareGuide(plantName, scientificName, lang);

    if (plantId) {
      await supabase.from('user_plants')
        .update({ care_guide: careGuide, difficulty: careGuide.difficulty, updated_at: new Date().toISOString() })
        .eq('id', plantId);
    }

    res.json({ success: true, data: careGuide });
  } catch (err) {
    console.error('Care guide error:', err.message);
    res.status(500).json({ error: 'Failed to generate care guide', details: err.message });
  }
});

export default router;
