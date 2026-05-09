import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/teams — list all teams with member count + captain info
router.get('/', authMiddleware, (req, res) => {
  try {
    const teams = db.prepare(`
      SELECT t.id, t.name, t.description, t.captain_id, t.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) AS member_count,
        (SELECT username FROM users u WHERE u.id = t.captain_id) AS captain_name
      FROM teams t
      ORDER BY t.name
    `).all();

    res.json({ teams: teams.filter((t) => t.member_count < 3) });
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ message: 'Failed to load teams' });
  }
});

// POST /api/teams/create — create team, creator becomes captain
router.post('/create', authMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Team name is required' });

    const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (user.team_id) return res.status(400).json({ message: 'You are already in a team' });

    const existing = db.prepare('SELECT id FROM teams WHERE name = ?').get(name.trim());
    if (existing) return res.status(400).json({ message: 'Team name already taken' });

    const result = db.prepare('INSERT INTO teams (name, captain_id) VALUES (?, ?)').run(name.trim(), req.user.id);
    const teamId = result.lastInsertRowid;

    db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(teamId, req.user.id);
    res.status(201).json({
      message: `Team "${name.trim()}" created. You are the captain!`,
      team_name: name.trim(),
      team_id: teamId,
    });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ message: 'Failed to create team' });
  }
});

// POST /api/teams/request-join — send join request to captain
router.post('/request-join', authMiddleware, (req, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) return res.status(400).json({ message: 'Team ID is required' });

    const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (user.team_id) return res.status(400).json({ message: 'You are already in a team' });

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const memberCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE team_id = ?').get(team_id).count;
    if (memberCount >= 3) return res.status(400).json({ message: 'Team is full (max 3 members)' });

    // Check if there's already a pending request
    const existing = db.prepare(
      "SELECT id, status FROM join_requests WHERE user_id = ? AND team_id = ? AND status = 'pending'"
    ).get(req.user.id, team_id);
    if (existing) return res.status(400).json({ message: 'You already have a pending request for this team' });

    db.prepare('INSERT OR REPLACE INTO join_requests (user_id, team_id, status) VALUES (?, ?, ?)').run(
      req.user.id, team_id, 'pending'
    );

    res.json({ message: `Join request sent to ${team.name}. Waiting for captain approval.` });
  } catch (err) {
    console.error('Request join error:', err);
    res.status(500).json({ message: 'Failed to send join request' });
  }
});

// GET /api/teams/my-requests — get current user's pending requests
router.get('/my-requests', authMiddleware, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT jr.id, jr.team_id, jr.status, jr.created_at, t.name AS team_name
      FROM join_requests jr
      JOIN teams t ON t.id = jr.team_id
      WHERE jr.user_id = ?
      ORDER BY jr.created_at DESC
    `).all(req.user.id);

    res.json({ requests });
  } catch (err) {
    console.error('My requests error:', err);
    res.status(500).json({ message: 'Failed to load requests' });
  }
});

// GET /api/teams/pending-requests — captain gets pending requests for their team
router.get('/pending-requests', authMiddleware, (req, res) => {
  try {
    // Find teams where this user is captain
    const team = db.prepare('SELECT id, name FROM teams WHERE captain_id = ?').get(req.user.id);
    if (!team) return res.json({ requests: [] });

    const requests = db.prepare(`
      SELECT jr.id, jr.user_id, jr.status, jr.created_at, u.username, u.email
      FROM join_requests jr
      JOIN users u ON u.id = jr.user_id
      WHERE jr.team_id = ? AND jr.status = 'pending'
      ORDER BY jr.created_at ASC
    `).all(team.id);

    res.json({ requests, team_id: team.id, team_name: team.name });
  } catch (err) {
    console.error('Pending requests error:', err);
    res.status(500).json({ message: 'Failed to load pending requests' });
  }
});

// POST /api/teams/requests/:id/approve — captain approves request
router.post('/requests/:id/approve', authMiddleware, (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const joinReq = db.prepare('SELECT * FROM join_requests WHERE id = ?').get(requestId);
    if (!joinReq) return res.status(404).json({ message: 'Request not found' });

    // Verify captain
    const team = db.prepare('SELECT * FROM teams WHERE id = ? AND captain_id = ?').get(joinReq.team_id, req.user.id);
    if (!team) return res.status(403).json({ message: 'Only the team captain can approve requests' });

    // Check team capacity
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE team_id = ?').get(team.id).count;
    if (memberCount >= 3) return res.status(400).json({ message: 'Team is full (max 3 members)' });

    // Check user isn't already in a team
    const user = db.prepare('SELECT team_id, username FROM users WHERE id = ?').get(joinReq.user_id);
    if (user.team_id) {
      db.prepare("UPDATE join_requests SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);
      return res.status(400).json({ message: 'User has already joined another team' });
    }

    // Approve: update request + assign user to team
    db.prepare("UPDATE join_requests SET status = 'approved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);
    db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(team.id, joinReq.user_id);

    // Reject other pending requests from this user
    db.prepare(
      "UPDATE join_requests SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'pending' AND id != ?"
    ).run(joinReq.user_id, requestId);

    res.json({ message: `${user.username} has been added to the team!` });
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(500).json({ message: 'Failed to approve request' });
  }
});

// POST /api/teams/requests/:id/reject — captain rejects request
router.post('/requests/:id/reject', authMiddleware, (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const joinReq = db.prepare('SELECT * FROM join_requests WHERE id = ?').get(requestId);
    if (!joinReq) return res.status(404).json({ message: 'Request not found' });

    const team = db.prepare('SELECT * FROM teams WHERE id = ? AND captain_id = ?').get(joinReq.team_id, req.user.id);
    if (!team) return res.status(403).json({ message: 'Only the team captain can reject requests' });

    db.prepare("UPDATE join_requests SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);
    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

// PUT /api/teams/transfer-captain — captain transfers role to teammate
router.put('/transfer-captain', authMiddleware, (req, res) => {
  try {
    const { new_captain_id } = req.body;
    if (!new_captain_id) return res.status(400).json({ message: 'New captain ID required' });

    // Find team where current user is captain
    const team = db.prepare('SELECT * FROM teams WHERE captain_id = ?').get(req.user.id);
    if (!team) return res.status(403).json({ message: 'You are not a team captain' });

    // Verify new captain is on the same team
    const newCaptain = db.prepare('SELECT id, username, team_id FROM users WHERE id = ?').get(new_captain_id);
    if (!newCaptain || newCaptain.team_id !== team.id) {
      return res.status(400).json({ message: 'That user is not on your team' });
    }

    db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(new_captain_id, team.id);
    res.json({ message: `Captain transferred to ${newCaptain.username}` });
  } catch (err) {
    console.error('Transfer captain error:', err);
    res.status(500).json({ message: 'Failed to transfer captain' });
  }
});

// GET /api/teams/:id — team details with captain info
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const members = db.prepare(
      'SELECT id, username, role, created_at FROM users WHERE team_id = ?'
    ).all(teamId);

    const solves = db.prepare(
      'SELECT user_id, COUNT(*) as count FROM solves WHERE team_id = ? GROUP BY user_id'
    ).all(teamId);
    const solveMap = Object.fromEntries(solves.map((s) => [s.user_id, s.count]));

    const teamStats = db.prepare(`
      SELECT COUNT(DISTINCT s.id) as solve_count, COALESCE(SUM(c.points), 0) as total_score
      FROM solves s JOIN challenges c ON c.id = s.challenge_id
      WHERE s.team_id = ?
    `).get(teamId);

    res.json({
      team: { ...team, ...teamStats },
      members: members.map((m) => ({
        ...m,
        solve_count: solveMap[m.id] || 0,
        is_captain: m.id === team.captain_id,
      })),
    });
  } catch (err) {
    console.error('Get team error:', err);
    res.status(500).json({ message: 'Failed to load team' });
  }
});

// GET /api/teams/:id/activity
router.get('/:id/activity', authMiddleware, (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const activities = db.prepare(`
      SELECT s.solved_at, u.username, c.title AS challenge_title, c.points
      FROM solves s
      JOIN users u ON u.id = s.user_id
      JOIN challenges c ON c.id = s.challenge_id
      WHERE s.team_id = ?
      ORDER BY s.solved_at DESC
      LIMIT 20
    `).all(teamId);

    res.json({ activities });
  } catch (err) {
    console.error('Team activity error:', err);
    res.status(500).json({ message: 'Failed to load activity' });
  }
});

export default router;
