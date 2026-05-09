import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xyz_ctf_secret_key_change_in_production';
const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, email, password, team_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists (case-insensitive username check)
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)').get(email, username);
    if (existing) {
      return res.status(400).json({ message: 'Email or username already taken' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    let teamId = null;

    // Handle team creation/joining
    if (team_name) {
      const existingTeam = db.prepare('SELECT id FROM teams WHERE name = ?').get(team_name);

      if (existingTeam) {
        // Check member count (max 3)
        const memberCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE team_id = ?').get(existingTeam.id);
        if (memberCount.count >= 3) {
          return res.status(400).json({ message: 'Team is full (max 3 members)' });
        }
        teamId = existingTeam.id;
      } else {
        // Create new team
        const result = db.prepare('INSERT INTO teams (name) VALUES (?)').run(team_name);
        teamId = result.lastInsertRowid;
      }
    }

    // Create user
    const result = db.prepare(
      'INSERT INTO users (username, email, password, team_id) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashedPassword, teamId);

    const user = db.prepare('SELECT id, username, email, role, team_id, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Get team name
    let teamName = null;
    if (user.team_id) {
      const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(user.team_id);
      teamName = team?.name;
    }

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { ...user, team_name: teamName },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get team name
    let teamName = null;
    if (user.team_id) {
      const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(user.team_id);
      teamName = team?.name;
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        team_name: teamName,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Not authenticated' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db.prepare('SELECT id, username, email, role, team_id, created_at FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let teamName = null;
    if (user.team_id) {
      const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(user.team_id);
      teamName = team?.name;
    }

    res.json({ user: { ...user, team_name: teamName } });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
