import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/announcements
router.get('/', authMiddleware, (req, res) => {
  try {
    const announcements = db.prepare(`
      SELECT a.*, u.username AS author_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.author_id
      ORDER BY a.created_at DESC
    `).all();

    res.json({ announcements });
  } catch (err) {
    console.error('Announcements error:', err);
    res.status(500).json({ message: 'Failed to load announcements' });
  }
});

// GET /api/activity — global solve feed
router.get('/activity', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = db.prepare(`
      SELECT s.solved_at, u.username, c.title AS challenge_title, c.points
      FROM solves s
      JOIN users u ON u.id = s.user_id
      JOIN challenges c ON c.id = s.challenge_id
      ORDER BY s.solved_at DESC
      LIMIT ?
    `).all(limit);

    res.json({ activities });
  } catch (err) {
    console.error('Activity error:', err);
    res.status(500).json({ message: 'Failed to load activity' });
  }
});

export default router;
