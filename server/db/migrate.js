/**
 * Database Migration Script
 * Creates all tables if they do not exist.
 * Run with: node server/db/migrate.js
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'ctf.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`\n  📦 Running migration on: ${dbPath}\n`);

db.exec(`
  -- Teams table
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    captain_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users table (password_hash, NOT password)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    team_id INTEGER REFERENCES teams(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Challenges table
  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
    points INTEGER DEFAULT 100,
    flag TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Solves table (tracks which user solved which challenge)
  CREATE TABLE IF NOT EXISTS solves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
  );

  -- Announcements table
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'info' CHECK (type IN ('broadcast', 'alert', 'info')),
    message TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Join requests table (team captain approval system)
  CREATE TABLE IF NOT EXISTS join_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    team_id INTEGER NOT NULL REFERENCES teams(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    UNIQUE(user_id, team_id)
  );
`);

// Verify tables were created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('  ✅ Tables created:');
tables.forEach((t) => console.log(`     - ${t.name}`));

db.close();
console.log('\n  Migration complete\n');
