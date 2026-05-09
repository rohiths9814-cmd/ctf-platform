import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/challenges — list active challenges (no flag exposed)
router.get('/', authMiddleware, (req, res) => {
  try {
    const challenges = db.prepare(
      `SELECT id, title, description, category, difficulty, points, status, created_at
       FROM challenges WHERE status = 'active' ORDER BY category, difficulty`
    ).all();

    // Get user's solves
    const solves = db.prepare('SELECT challenge_id FROM solves WHERE user_id = ?').all(req.user.id);
    const solvedIds = new Set(solves.map((s) => s.challenge_id));

    // Get solve counts per challenge
    const solveCounts = db.prepare(
      'SELECT challenge_id, COUNT(*) as count FROM solves GROUP BY challenge_id'
    ).all();
    const countMap = Object.fromEntries(solveCounts.map((s) => [s.challenge_id, s.count]));

    res.json({
      challenges: challenges.map((c) => ({
        ...c,
        is_solved: solvedIds.has(c.id),
        solve_count: countMap[c.id] || 0,
      })),
    });
  } catch (err) {
    console.error('Get challenges error:', err);
    res.status(500).json({ message: 'Failed to load challenges' });
  }
});

// POST /api/challenges/:id/submit — submit a flag
router.post('/:id/submit', authMiddleware, (req, res) => {
  try {
    const challengeId = parseInt(req.params.id);
    const { flag } = req.body;

    if (!flag) return res.status(400).json({ success: false, message: 'Flag is required' });

    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ? AND status = ?').get(challengeId, 'active');
    if (!challenge) return res.json({ success: false, message: 'Challenge not found' });

    // Already solved?
    const existing = db.prepare('SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?').get(req.user.id, challengeId);
    if (existing) return res.json({ success: false, message: 'You have already solved this challenge' });

    // Check flag
    if (challenge.flag !== flag.trim()) {
      return res.json({ success: false, message: 'Incorrect flag. Try again.' });
    }

    // Get user team
    const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);

    // Record solve
    db.prepare('INSERT INTO solves (user_id, challenge_id, team_id) VALUES (?, ?, ?)').run(
      req.user.id, challengeId, user.team_id
    );

    res.json({
      success: true,
      message: `Correct! +${challenge.points} points!`,
      points: challenge.points,
    });
  } catch (err) {
    console.error('Submit flag error:', err);
    res.status(500).json({ success: false, message: 'Submission failed' });
  }
});

// GET /api/challenges/categories — user progress per category
router.get('/categories', authMiddleware, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT
        c.category AS name,
        COUNT(*) AS total,
        COUNT(s.id) AS solved
      FROM challenges c
      LEFT JOIN solves s ON s.challenge_id = c.id AND s.user_id = ?
      WHERE c.status = 'active'
      GROUP BY c.category
      ORDER BY c.category
    `).all(req.user.id);

    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

// GET /api/challenges/stats — user personal stats
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    const solved = db.prepare('SELECT COUNT(*) as count FROM solves WHERE user_id = ?').get(req.user.id).count;
    const total = db.prepare("SELECT COUNT(*) as count FROM challenges WHERE status = 'active'").get().count;

    const totalPts = db.prepare(`
      SELECT COALESCE(SUM(c.points), 0) as pts
      FROM solves s JOIN challenges c ON c.id = s.challenge_id
      WHERE s.team_id = ?
    `).get(user.team_id || 0).pts;

    // Team rank
    const rankings = db.prepare(`
      SELECT t.id, COALESCE(SUM(c.points), 0) as score
      FROM teams t
      LEFT JOIN solves s ON s.team_id = t.id
      LEFT JOIN challenges c ON c.id = s.challenge_id
      GROUP BY t.id
      ORDER BY score DESC
    `).all();

    const rank = rankings.findIndex((r) => r.id === user.team_id) + 1;

    res.json({
      solved,
      total,
      solve_rate: total > 0 ? Math.round((solved / total) * 100) : 0,
      total_points: totalPts,
      rank: rank || 0,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

export default router;
