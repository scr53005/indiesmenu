"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
var pg_1 = require("pg");
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'undefined');
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}
var pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL, // Use DATABASE_URL for local and production
    ssl: { rejectUnauthorized: false }, // For Neon SSL
});
// Initialize table (run once, can be commented out after first run)
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var restaurant, user1, user2, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, , 16]);
                    return [4 /*yield*/, pool.query("\n      CREATE TABLE IF NOT EXISTS public.transfers (\n        id BIGINT PRIMARY KEY,\n        from_account TEXT NOT NULL,\n        amount TEXT NOT NULL,\n        symbol TEXT NOT NULL,\n        memo TEXT,\n        parsed_memo TEXT,\n        fulfilled BOOLEAN DEFAULT FALSE,\n        fulfilled_at TIMESTAMP\n      )\n    ")];
                case 1:
                    _a.sent();
                    console.log('PostgreSQL transfers table initialized in public schema', process.env.DATABASE_URL);
                    // Create restaurants table
                    return [4 /*yield*/, pool.query("\n      CREATE TABLE IF NOT EXISTS restaurants (\n        id SERIAL PRIMARY KEY,\n        name VARCHAR(100) NOT NULL UNIQUE,\n        display_name VARCHAR(255) NOT NULL,\n        description TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      )\n    ")];
                case 2:
                    // Create restaurants table
                    _a.sent();
                    console.log('PostgreSQL restaurants table initialized in public schema', process.env.DATABASE_URL);
                    // Create users table
                    return [4 /*yield*/, pool.query("\n      CREATE TABLE IF NOT EXISTS users (\n        id SERIAL PRIMARY KEY,\n        hive_username VARCHAR(100) NOT NULL UNIQUE,\n        display_name VARCHAR(255),\n        email VARCHAR(255),\n        is_active BOOLEAN DEFAULT true,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      )\n    ")];
                case 3:
                    // Create users table
                    _a.sent();
                    console.log('PostgreSQL users table initialized in public schema', process.env.DATABASE_URL);
                    // Create user_restaurant_authorizations table
                    return [4 /*yield*/, pool.query("\n      CREATE TABLE IF NOT EXISTS user_restaurant_authorizations (\n        id SERIAL PRIMARY KEY,\n        user_id INTEGER NOT NULL,\n        restaurant_id INTEGER NOT NULL,\n        role VARCHAR(50) NOT NULL DEFAULT 'admin',\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (user_id) REFERENCES users (id),\n        FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),\n        UNIQUE(user_id, restaurant_id)\n      )\n    ")];
                case 4:
                    // Create user_restaurant_authorizations table
                    _a.sent();
                    // Insert default restaurant (Indie's)
                    return [4 /*yield*/, pool.query("\n      INSERT INTO restaurants (name, display_name, description) \n      VALUES ('indies', 'Indie''s', 'Indie''s Cafe and Restaurant')\n      ON CONFLICT (name) DO NOTHING\n    ")];
                case 5:
                    // Insert default restaurant (Indie's)
                    _a.sent();
                    // Insert default users
                    return [4 /*yield*/, pool.query("\n      INSERT INTO users (hive_username, display_name) \n      VALUES ('indies-test', 'Indie''s Test Account')\n      ON CONFLICT (hive_username) DO NOTHING\n    ")];
                case 6:
                    // Insert default users
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n      INSERT INTO users (hive_username, display_name) \n      VALUES ('indies.cafe', 'Indie''s Cafe Account')\n      ON CONFLICT (hive_username) DO NOTHING\n    ")];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, pool.query('SELECT id FROM restaurants WHERE name = $1', ['indies'])];
                case 8:
                    restaurant = _a.sent();
                    return [4 /*yield*/, pool.query('SELECT id FROM users WHERE hive_username = $1', ['indies-test'])];
                case 9:
                    user1 = _a.sent();
                    return [4 /*yield*/, pool.query('SELECT id FROM users WHERE hive_username = $1', ['indies.cafe'])];
                case 10:
                    user2 = _a.sent();
                    if (!(restaurant.rows.length > 0 && user1.rows.length > 0)) return [3 /*break*/, 12];
                    return [4 /*yield*/, pool.query("\n        INSERT INTO user_restaurant_authorizations (user_id, restaurant_id, role) \n        VALUES ($1, $2, 'admin')\n        ON CONFLICT (user_id, restaurant_id) DO NOTHING\n      ", [user1.rows[0].id, restaurant.rows[0].id])];
                case 11:
                    _a.sent();
                    _a.label = 12;
                case 12:
                    if (!(restaurant.rows.length > 0 && user2.rows.length > 0)) return [3 /*break*/, 14];
                    return [4 /*yield*/, pool.query("\n        INSERT INTO user_restaurant_authorizations (user_id, restaurant_id, role) \n        VALUES ($1, $2, 'admin')\n        ON CONFLICT (user_id, restaurant_id) DO NOTHING\n      ", [user2.rows[0].id, restaurant.rows[0].id])];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14: return [3 /*break*/, 16];
                case 15:
                    error_1 = _a.sent();
                    console.error('PostgreSQL initialization error:', error_1);
                    throw error_1;
                case 16: return [2 /*return*/];
            }
        });
    });
}
// Test connection
pool.connect(function (err, client, release) {
    if (err) {
        console.error('Database connection error:', err.stack);
        return;
    }
    console.log('Successfully connected to database:', process.env.DATABASE_URL);
    release();
});
// Run initialization (comment out after first run)
// initializeDatabase().catch(error => console.error('Initialization failed:', error));
exports.default = pool;
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
