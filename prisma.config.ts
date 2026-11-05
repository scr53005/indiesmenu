import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7: the CLI no longer reads .env by itself, and the datasource URL moved here from
// schema.prisma. Load .env.local first (Next.js convention), then .env; on Vercel the
// variables are already in the environment.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export default defineConfig({
  datasource: {
    url: process.env.POSTGRES_URL!,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
