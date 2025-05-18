import Database from 'better-sqlite3';

const db = new Database(process.env.NODE_ENV === 'production' ? '/tmp/app.db' : './app.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY,
    from_account TEXT,
    amount TEXT,
    symbol TEXT,
    memo TEXT,
    parsed_memo TEXT,
    fulfilled BOOLEAN DEFAULT FALSE,
    fulfilled_at TIMESTAMP
  )
`);

export default db;

