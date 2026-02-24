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
