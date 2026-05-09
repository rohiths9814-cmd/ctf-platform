import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

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
