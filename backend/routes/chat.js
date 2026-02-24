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
