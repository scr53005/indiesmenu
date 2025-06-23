// scripts/migrate.ts
import { initializeDatabase } from '../lib/db';

async function migrate() {
  await initializeDatabase();
  //await insertSampleData();
  console.log('Migration and seeding complete');
  process.exit(0);
}

migrate().catch(console.error);