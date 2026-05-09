const db = require('better-sqlite3')('ctf.db');
const action = process.argv[2];
const value = process.argv[3];

switch (action) {
  case 'list':
    console.table(db.prepare('SELECT id, username, email, role, team_id FROM users').all());
    break;

  case 'delete':
    if (!value) { console.log('Usage: node admin.cjs delete <username or id>'); break; }
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR id = ?').get(value, Number(value) || 0);
    if (!user) { console.log('User not found'); break; }
    db.prepare('DELETE FROM solves WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    console.log(`✅ Deleted user: ${user.username} (${user.email})`);
    console.table(db.prepare('SELECT id, username, email, role FROM users').all());
    break;

  case 'promote':
    if (!value) { console.log('Usage: node admin.cjs promote <username>'); break; }
    db.prepare("UPDATE users SET role = 'admin' WHERE username = ?").run(value);
    console.log(`✅ ${value} promoted to admin`);
    console.table(db.prepare('SELECT id, username, role FROM users').all());
    break;

  case 'demote':
    if (!value) { console.log('Usage: node admin.cjs demote <username>'); break; }
    db.prepare("UPDATE users SET role = 'user' WHERE username = ?").run(value);
    console.log(`✅ ${value} demoted to user`);
    console.table(db.prepare('SELECT id, username, role FROM users').all());
    break;

  case 'fix-captains':
    // Set captain for teams that don't have one (first member becomes captain)
    const teams = db.prepare('SELECT id, name, captain_id FROM teams').all();
    for (const team of teams) {
      if (!team.captain_id) {
        const firstMember = db.prepare('SELECT id, username FROM users WHERE team_id = ? ORDER BY created_at ASC LIMIT 1').get(team.id);
        if (firstMember) {
          db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(firstMember.id, team.id);
          console.log(`✅ Set ${firstMember.username} as captain of ${team.name}`);
        }
      }
    }
    console.table(db.prepare('SELECT t.id, t.name, t.captain_id, u.username AS captain_name FROM teams t LEFT JOIN users u ON u.id = t.captain_id').all());
    break;

  case 'reset':
    db.prepare('DELETE FROM join_requests').run();
    db.prepare('DELETE FROM solves').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM teams').run();
    console.log('✅ All users, teams, solves, and requests wiped');
    break;

  default:
    console.log(`
  XYZ_CTF Admin Tool
  ──────────────────
  node admin.cjs list               - List all users
  node admin.cjs delete <username>  - Delete a user
  node admin.cjs promote <username> - Make admin
  node admin.cjs demote <username>  - Remove admin
  node admin.cjs fix-captains       - Set captains for teams without one
  node admin.cjs reset              - Wipe all data
    `);
}
