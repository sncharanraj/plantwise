import express from 'express';
import supabase from '../services/supabaseService.js';

const router = express.Router();

// Fetch a real plant image from Unsplash (free, no API key needed)
async function fetchPlantImage(plantName, scientificName) {
  try {
    const query = encodeURIComponent(scientificName || plantName);
    const res = await fetch(
      `https://source.unsplash.com/400x300/?${query},plant`,
      { redirect: 'follow' }
    );
    if (res.ok && res.url && !res.url.includes('source.unsplash.com')) {
      return res.url;
    }

    // Fallback: try with common name only
    const res2 = await fetch(
      `https://source.unsplash.com/400x300/?${encodeURIComponent(plantName)},plant`,
      { redirect: 'follow' }
    );
    if (res2.ok && res2.url) return res2.url;

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
      console.log(`Fetching image for ${plantName}...`);
      finalImageUrl = await fetchPlantImage(plantName, scientificName);
      console.log(`Image URL: ${finalImageUrl}`);
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

    await supabase.from('user_plants')
      .update({ image_url: imageUrl })
      .eq('id', req.params.plantId);

    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh image' });
  }
});

export default router;
