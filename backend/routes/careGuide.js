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
