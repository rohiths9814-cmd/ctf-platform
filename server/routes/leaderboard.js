import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/leaderboard
router.get('/', authMiddleware, (req, res) => {
  try {
    const rankings = db.prepare(`
      SELECT
        t.id AS team_id,
        t.name AS team_name,
        COALESCE(SUM(c.points), 0) AS total_score,
        COUNT(DISTINCT s.id) AS solve_count,
        (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) AS member_count,
        MAX(s.solved_at) AS last_solve
      FROM teams t
      LEFT JOIN solves s ON s.team_id = t.id
      LEFT JOIN challenges c ON c.id = s.challenge_id
      GROUP BY t.id, t.name
      ORDER BY total_score DESC, last_solve ASC
    `).all();

    res.json({ rankings });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Failed to load leaderboard' });
  }
});

// GET /api/leaderboard/chart — cumulative score over time per team
router.get('/chart', authMiddleware, (req, res) => {
  try {
    // Get all solves with team info, ordered by time
    const solves = db.prepare(`
      SELECT s.solved_at, t.id AS team_id, t.name AS team_name, c.points
      FROM solves s
      JOIN teams t ON t.id = s.team_id
      JOIN challenges c ON c.id = s.challenge_id
      ORDER BY s.solved_at ASC
    `).all();

    if (solves.length === 0) {
      return res.json({ chart: [], teams: [] });
    }

    // Get all team names
    const teamNames = [...new Set(solves.map((s) => s.team_name))];

    // Build cumulative data points
    const cumulative = {};
    teamNames.forEach((name) => { cumulative[name] = 0; });

    // Start point (all zeros)
    const chartData = [{ time: solves[0].solved_at, ...Object.fromEntries(teamNames.map((n) => [n, 0])) }];

    for (const solve of solves) {
      cumulative[solve.team_name] += solve.points;
      chartData.push({
        time: solve.solved_at,
        ...Object.fromEntries(teamNames.map((n) => [n, cumulative[n]])),
      });
    }

    res.json({ chart: chartData, teams: teamNames });
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ message: 'Failed to load chart data' });
  }
});

export default router;

