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
