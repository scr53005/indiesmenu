import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use DATABASE_URL for local and production
});

// Initialize table (run once, can be commented out after first run)
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.transfers (
        id BIGINT PRIMARY KEY,
        from_account TEXT NOT NULL,
        amount TEXT NOT NULL,
        symbol TEXT NOT NULL,
        memo TEXT,
        parsed_memo TEXT,
        fulfilled BOOLEAN DEFAULT FALSE,
        fulfilled_at TIMESTAMP
      )
    `);
    console.log('PostgreSQL transfers table initialized in public schema');
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  }
}

// Run initialization (comment out after first run)
initializeDatabase().catch(error => console.error('Initialization failed:', error));

export default pool;



/*import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use absolute path for app.db
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/app.db' : path.resolve(process.cwd(), 'app.db');
const dbDir = path.dirname(dbPath);

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created directory: ${dbDir}`);
  }

  const db = new Database(dbPath, { verbose: console.log });
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      from_account TEXT,
      amount TEXT,
      symbol TEXT,
      memo TEXT,
      parsed_memo TEXT,
      fulfilled BOOLEAN DEFAULT FALSE,
      fulfilled_at TIMESTAMP
    )
  `);
  console.log(`SQLite database initialized at ${dbPath}`);
} catch (error) {
  console.error('SQLite initialization error:', error);
  throw error;
}

const db = new Database(dbPath);
export default db;*/