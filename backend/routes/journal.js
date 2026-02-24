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
