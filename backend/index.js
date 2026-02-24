import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import identifyRoutes from './routes/identify.js';
import careGuideRoutes from './routes/careGuide.js';
import chatRoutes from './routes/chat.js';
import plantsRoutes from './routes/plants.js';
import journalRoutes from './routes/journal.js';
import notificationRoutes from './routes/notifications.js';
import { sendWateringReminders } from './services/notificationService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/identify', identifyRoutes);
app.use('/api/care-guide', careGuideRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/plants', plantsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

cron.schedule('0 8 * * *', async () => {
  console.log('Running daily reminder cron job...');
  await sendWateringReminders();
});

app.listen(PORT, () => {
  console.log(`🌱 Plant App Backend running on port ${PORT}`);
});
