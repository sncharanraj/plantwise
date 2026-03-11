import express from 'express';
import supabase from '../services/supabaseService.js';
import { translatePlantNames } from '../services/geminiService.js';

const router = express.Router();

// Fetch plant image using Wikimedia Commons (free, no API key, very reliable)
async function fetchPlantImage(plantName, scientificName) {
  try {
    // Try scientific name first (more accurate)
    const queries = [scientificName, plantName].filter(Boolean);

    for (const query of queries) {
      const encoded = encodeURIComponent(query);
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PlantWise/1.0 (plant care app)' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail?.source) {
          // Get higher resolution version
          const highRes = data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
          console.log(`Found Wikipedia image for "${query}": ${highRes}`);
          return highRes;
        }
      }
    }

    // Fallback: Wikimedia search
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(scientificName || plantName)}&prop=pageimages&format=json&pithumbsize=400&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = Object.values(searchData.query?.pages || {});
      const img = pages[0]?.thumbnail?.source;
      if (img) {
        console.log(`Found Wikimedia image: ${img}`);
        return img;
      }
    }

    console.log(`No image found for ${plantName}`);
    return null;
  } catch (e) {
    console.error('Image fetch error:', e.message);
    return null;
  }
}

router.get('/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_plants')
      .select('id, plant_name, scientific_name, family, image_url, difficulty, identified_via, created_at')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
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

    // Auto-fetch plant image if none provided
    let finalImageUrl = imageUrl;
    if (!finalImageUrl) {
      console.log(`Fetching image for ${plantName} (${scientificName})...`);
      finalImageUrl = await fetchPlantImage(plantName, scientificName);
    }

    const { data, error } = await supabase
      .from('user_plants')
      .insert({
        user_id: userId,
        plant_name: plantName,
        scientific_name: scientificName,
        family,
        image_url: finalImageUrl,
        difficulty,
        identified_via: identifiedVia || 'name'
      })
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
      .from('user_plants')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

// Refresh image for existing plant
router.post('/:plantId/refresh-image', async (req, res) => {
  try {
    const { plantName, scientificName } = req.body;
    const imageUrl = await fetchPlantImage(plantName, scientificName);
    if (!imageUrl) return res.status(404).json({ error: 'No image found' });
    await supabase.from('user_plants').update({ image_url: imageUrl }).eq('id', req.params.plantId);
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh image' });
  }
});

router.post('/translate-names', async (req, res) => {
  try {
    const { names, lang } = req.body;
    if (!names || !Array.isArray(names) || !lang) {
      return res.status(400).json({ error: 'names (array) and lang required' });
    }
    if (lang === 'en') return res.json({ success: true, data: {} });
    const { translatePlantNames } = await import('../services/geminiService.js');
    const translations = await translatePlantNames(names, lang);
    res.json({ success: true, data: translations });
  } catch (err) {
    console.error('Translate names error:', err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
