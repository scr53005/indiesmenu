import { Pool } from 'pg';

console.log('DATABASE_URL:', process.env.DATABASE_URL || 'undefined');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use DATABASE_URL for local and production
  ssl: { rejectUnauthorized: false }, // For Neon SSL
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
    console.log('PostgreSQL transfers table initialized in public schema', process.env.DATABASE_URL);
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  }
}

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.stack);
    return;
  }
  console.log('Successfully connected to database:', process.env.DATABASE_URL);
  release();
});

// Run initialization (comment out after first run)
initializeDatabase().catch(error => console.error('Initialization failed:', error));

export default pool;

/*
  # Recommended for most uses
DATABASE_URL=postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Parameters for constructing your own connection string
PGHOST=ep-silent-smoke-a2axro2k-pooler.eu-central-1.aws.neon.tech
PGHOST_UNPOOLED=ep-silent-smoke-a2axro2k.eu-central-1.aws.neon.tech
PGUSER=neondb_owner
PGDATABASE=neondb
PGPASSWORD=npg_QTdeUb2YofS3

# Parameters for Vercel Postgres Templates
POSTGRES_URL=postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k.eu-central-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-silent-smoke-a2axro2k-pooler.eu-central-1.aws.neon.tech
POSTGRES_PASSWORD=npg_QTdeUb2YofS3
POSTGRES_DATABASE=neondb
POSTGRES_URL_NO_SSL=postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler.eu-central-1.aws.neon.tech/neondb
POSTGRES_PRISMA_URL=postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler.eu-central-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require

# Neon Auth environment variables for Next.js
NEXT_PUBLIC_STACK_PROJECT_ID=f24ae760-c780-4eca-9664-2a00178a9c0f
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_kczgzyayvnecrkch57dfgq0vg7p2cf8speh2w5bfn7hy8
STACK_SECRET_SERVER_KEY=ssk_knnjv0gxvx9bxf7qt5dw22wqwbbkk4x4kaw3jcecffrcr
*/


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