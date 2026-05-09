const db = require('better-sqlite3')('ctf.db');
db.prepare("UPDATE users SET role = 'admin' WHERE username = 'rohith'").run();
console.log('✅ rohith promoted to admin!');
console.table(db.prepare('SELECT id, username, role FROM users').all());
