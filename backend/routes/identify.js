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
    console.error('Identify by name error:', err.message);
    res.status(500).json({ error: 'Failed to identify plant', details: err.message });
  }
});

router.post('/by-image', async (req, res) => {
  try {
    let { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'Image data is required' });

    // Groq vision works best with jpeg/png - normalize mimeType
    if (!mimeType || mimeType === 'image/webp' || mimeType === 'image/gif') {
      mimeType = 'image/jpeg';
    }

    // Validate base64 string
    if (image.includes(',')) {
      image = image.split(',')[1];
    }

    const result = await identifyPlantByImage(image, mimeType);
    res.json({ success: true, data: result, source: 'groq-vision' });
  } catch (err) {
    console.error('Identify by image error:', err.message);
    res.status(500).json({ error: 'Failed to identify plant from image', details: err.message });
  }
});

export default router;
