import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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

// ─── Rate Limiting ───────────────────────────────────
// Global: 30 requests per minute per IP (all API routes)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 30,                     // 30 requests per window
  standardHeaders: true,       // Return rate limit info in headers
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded. Maximum 30 requests per minute. Try again shortly.' },
});

// Strict: Auth routes (login/register) — 5 per minute to prevent brute force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many auth attempts. Please wait 1 minute before trying again.' },
});

// Flag submissions: 10 per minute per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many flag submissions. Slow down and try again in a minute.' },
});

// Apply rate limiters
app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/challenges/:id/submit', submitLimiter);

// ─── Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/announcements', miscRoutes);
app.use('/api', miscRoutes); // /api/activity

// Health check (not rate-limited)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n  🔒 XYZ_CTF Server running on http://localhost:${PORT}`);
  console.log(`  🛡️  Rate limiting: 30 req/min global | 5 req/min auth | 10 req/min flags`);
  console.log(`  📊 API endpoints at http://localhost:${PORT}/api\n`);
});
