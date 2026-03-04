import express from 'express';
import supabase from '../services/supabaseService.js';

const router = express.Router();

router.post('/:plantId/message', async (req, res) => {
  try {
    const { plantId } = req.params;
    const { message, userId } = req.body;

    console.log('Chat request received:', { plantId, userId, message: message?.slice(0, 50) });

    if (!message || !userId) {
      return res.status(400).json({ error: 'message and userId are required' });
    }

    // Fetch plant
    const { data: plant, error: plantError } = await supabase
      .from('user_plants').select('*').eq('id', plantId).single();

    if (plantError) {
      console.error('Plant fetch error:', plantError.message);
      return res.status(404).json({ error: 'Plant not found' });
    }

    const daysSinceAdded = Math.floor(
      (new Date() - new Date(plant.created_at)) / (1000 * 60 * 60 * 24)
    );

    // Try AI, always fall back gracefully
    let aiResponse;
    try {
      const { chatWithPlantExpert } = await import('../services/geminiService.js');

      const { data: chatHistory } = await supabase
        .from('plant_chats').select('role, message')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: true })
        .limit(20);

      const { data: journalEntries } = await supabase
        .from('growth_logs').select('note, logged_at')
        .eq('plant_id', plantId)
        .order('logged_at', { ascending: false })
        .limit(5);

      aiResponse = await chatWithPlantExpert(
        { ...plant, journal_entries: journalEntries || [] },
        chatHistory || [],
        message,
        daysSinceAdded
      );

    } catch (aiError) {
      console.error('AI failed, using fallback:', aiError.message);
      const cg = plant.care_guide;
      const lowerMsg = message.toLowerCase();

      if (lowerMsg.includes('water')) {
        aiResponse = `💧 Watering your ${plant.plant_name}: ${cg?.watering?.frequency || 'Check care guide'}. ${cg?.watering?.tips || ''}`;
      } else if (lowerMsg.includes('light') || lowerMsg.includes('sun')) {
        aiResponse = `☀️ Light for ${plant.plant_name}: ${cg?.sunlight?.requirement || 'Check care guide'}. ${cg?.sunlight?.tips || ''}`;
      } else if (lowerMsg.includes('soil')) {
        aiResponse = `🌍 Soil for ${plant.plant_name}: ${cg?.soil?.type || 'Check care guide'}. pH: ${cg?.soil?.ph || ''}`;
      } else if (lowerMsg.includes('fertiliz')) {
        aiResponse = `🌿 Fertilizing ${plant.plant_name}: ${cg?.fertilizer?.frequency || 'Check care guide'}. Use ${cg?.fertilizer?.type || ''}`;
      } else if (lowerMsg.includes('yellow') || lowerMsg.includes('problem') || lowerMsg.includes('sick')) {
        const p = cg?.commonProblems?.[0];
        aiResponse = p ? `⚠️ Common issue: ${p.problem} — ${p.solution}` : `Check the Care Guide tab for common problems with your ${plant.plant_name}.`;
      } else {
        aiResponse = `🌱 Your ${plant.plant_name} has been growing for ${daysSinceAdded} days! ${cg?.overview || ''} Check the Care Guide tab for full details.`;
      }
    }

    // Save both messages
    await supabase.from('plant_chats').insert([
      { plant_id: plantId, user_id: userId, role: 'user', message },
      { plant_id: plantId, user_id: userId, role: 'assistant', message: aiResponse }
    ]);

    console.log('Chat response sent successfully');
    res.json({ success: true, response: aiResponse, daysSinceAdded });

  } catch (err) {
    console.error('CHAT ROUTE CRASHED:', err.message, err.stack);
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

router.get('/:plantId/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plant_chats').select('*')
      .eq('plant_id', req.params.plantId)
      .order('created_at', { ascending: true });
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
