import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import adminRoutes from './routes/admin.js';
import leaderboardRoutes from './routes/leaderboard.js';
import teamRoutes from './routes/teams.js';
import miscRoutes from './routes/misc.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/announcements', miscRoutes);
app.use('/api', miscRoutes); // /api/activity

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n  🔒 XYZ_CTF Server running on http://localhost:${PORT}`);
  console.log(`  📊 API endpoints at http://localhost:${PORT}/api\n`);
});
