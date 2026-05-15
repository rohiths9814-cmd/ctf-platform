import { Router } from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/challenges — all challenges (including hidden + flag)
router.get('/challenges', (req, res) => {
  try {
    const challenges = db.prepare('SELECT * FROM challenges ORDER BY created_at DESC').all();

    const solveCounts = db.prepare('SELECT challenge_id, COUNT(*) as count FROM solves GROUP BY challenge_id').all();
    const countMap = Object.fromEntries(solveCounts.map((s) => [s.challenge_id, s.count]));

    res.json({
      challenges: challenges.map((c) => ({ ...c, solve_count: countMap[c.id] || 0 })),
    });
  } catch (err) {
    console.error('Admin get challenges:', err);
    res.status(500).json({ message: 'Failed to load challenges' });
  }
});

// POST /api/admin/challenges — create challenge
router.post('/challenges', (req, res) => {
  try {
    const { title, description, category, difficulty, points, flag, status } = req.body;
    if (!title || !category || !flag) {
      return res.status(400).json({ message: 'Title, category, and flag are required' });
    }

    const result = db.prepare(
      'INSERT INTO challenges (title, description, category, difficulty, points, flag, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(title, description || '', category, difficulty || 1, points || 100, flag, status || 'active');

    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(challenge);
  } catch (err) {
    console.error('Admin create challenge:', err);
    res.status(500).json({ message: 'Failed to create challenge' });
  }
});

// PUT /api/admin/challenges/:id — update challenge
router.put('/challenges/:id', (req, res) => {
  try {
    const { title, description, category, difficulty, points, flag, status } = req.body;
    const id = parseInt(req.params.id);

    const existing = db.prepare('SELECT * FROM challenges WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Challenge not found' });

    db.prepare(
      'UPDATE challenges SET title=?, description=?, category=?, difficulty=?, points=?, flag=?, status=? WHERE id=?'
    ).run(
      title || existing.title,
      description ?? existing.description,
      category || existing.category,
      difficulty || existing.difficulty,
      points || existing.points,
      flag || existing.flag,
      status || existing.status,
      id
    );

    const updated = db.prepare('SELECT * FROM challenges WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Admin update challenge:', err);
    res.status(500).json({ message: 'Failed to update challenge' });
  }
});

// DELETE /api/admin/challenges/:id
router.delete('/challenges/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare('DELETE FROM challenges WHERE id = ?').run(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Admin delete challenge:', err);
    res.status(500).json({ message: 'Failed to delete challenge' });
  }
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const stats = {
      total_teams: db.prepare('SELECT COUNT(*) as c FROM teams').get().c,
      total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      total_challenges: db.prepare('SELECT COUNT(*) as c FROM challenges').get().c,
      total_solves: db.prepare('SELECT COUNT(*) as c FROM solves').get().c,
      total_categories: db.prepare('SELECT COUNT(DISTINCT category) as c FROM challenges').get().c,
    };
    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// GET /api/admin/join-requests — all pending requests across all teams
router.get('/join-requests', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT jr.id, jr.status, jr.created_at,
             u.id as user_id, u.username, u.email,
             t.id as team_id, t.name as team_name,
             captain.username as captain_name
      FROM join_requests jr
      JOIN users u ON u.id = jr.user_id
      JOIN teams t ON t.id = jr.team_id
      LEFT JOIN users captain ON captain.id = t.captain_id
      ORDER BY
        CASE jr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        jr.created_at DESC
    `).all();
    res.json({ requests });
  } catch (err) {
    console.error('Admin join requests error:', err);
    res.status(500).json({ message: 'Failed to load join requests' });
  }
});

// GET /api/admin/health — system health metrics
router.get('/health', (req, res) => {
  try {
    const dbPath = join(__dirname, '..', 'ctf.db');

    // DB file size
    let dbSizeMB = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    } catch { dbSizeMB = 0; }

    // Recent activity (last 24h)
    const recentSolves = db.prepare(
      "SELECT COUNT(*) as c FROM solves WHERE solved_at >= datetime('now', '-24 hours')"
    ).get().c;

    const recentRegistrations = db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-24 hours')"
    ).get().c;

    // Avg score per team
    const avgScore = db.prepare(`
      SELECT COALESCE(ROUND(AVG(team_score), 0), 0) as avg FROM (
        SELECT t.id, COALESCE(SUM(c.points), 0) as team_score
        FROM teams t
        LEFT JOIN solves s ON s.team_id = t.id
        LEFT JOIN challenges c ON c.id = s.challenge_id
        GROUP BY t.id
      )
    `).get().avg;

    // Active challenges
    const activeChallenges = db.prepare(
      "SELECT COUNT(*) as c FROM challenges WHERE status = 'active'"
    ).get().c;

    const totalChallenges = db.prepare('SELECT COUNT(*) as c FROM challenges').get().c;

    // Total teams with at least one solve
    const activeTeams = db.prepare(
      'SELECT COUNT(DISTINCT team_id) as c FROM solves WHERE team_id IS NOT NULL'
    ).get().c;

    const totalTeams = db.prepare('SELECT COUNT(*) as c FROM teams').get().c;

    // Pending join requests count
    const pendingRequests = db.prepare(
      "SELECT COUNT(*) as c FROM join_requests WHERE status = 'pending'"
    ).get().c;

    // Server uptime
    const uptimeSeconds = process.uptime();

    res.json({
      db_size_mb: parseFloat(dbSizeMB),
      uptime_seconds: Math.floor(uptimeSeconds),
      recent_solves_24h: recentSolves,
      recent_registrations_24h: recentRegistrations,
      avg_team_score: avgScore,
      active_challenges: activeChallenges,
      total_challenges: totalChallenges,
      active_teams: activeTeams,
      total_teams: totalTeams,
      pending_requests: pendingRequests,
    });
  } catch (err) {
    console.error('Admin health error:', err);
    res.status(500).json({ message: 'Failed to load health data' });
  }
});

// POST /api/admin/announcements
router.post('/announcements', (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const result = db.prepare(
      'INSERT INTO announcements (message, type, author_id) VALUES (?, ?, ?)'
    ).run(message, type || 'info', req.user.id);

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(announcement);
  } catch (err) {
    console.error('Admin create announcement:', err);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
});

// ─── USER MANAGEMENT ─────────────────────────────────

// GET /api/admin/users — list all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.email, u.role, u.team_id, u.created_at, t.name AS team_name
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      ORDER BY u.created_at DESC
    `).all();

    // Get solve count per user
    const solveCounts = db.prepare('SELECT user_id, COUNT(*) as count FROM solves GROUP BY user_id').all();
    const solveMap = Object.fromEntries(solveCounts.map((s) => [s.user_id, s.count]));

    res.json({
      users: users.map((u) => ({ ...u, solve_count: solveMap[u.id] || 0 })),
    });
  } catch (err) {
    console.error('Admin get users:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// PUT /api/admin/users/:id/role — promote/demote
router.put('/users/:id/role', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be "user" or "admin"' });
    }

    // Prevent self-demotion
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot demote yourself' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    const updated = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Admin update role:', err);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    db.prepare('DELETE FROM solves WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: `User "${user.username}" deleted` });
  } catch (err) {
    console.error('Admin delete user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
