// scripts/loadEnv.ts
// Loads .env for standalone tsx scripts. MUST be called at the top of main()
// BEFORE any dynamic import of ../lib/prisma, or the Prisma client resolves its
// datasource URL (DATABASE_URL / POSTGRES_URL) before dotenv has populated it.
import * as dotenv from 'dotenv';
import * as path from 'path';

export function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}
