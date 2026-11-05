import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7: the client needs a driver adapter, and the URL comes from POSTGRES_URL (never
// DATABASE_URL: Vercel's password rotation only updates POSTGRES_URL). Every server file
// shares this one client. Don't call $disconnect() in a route: it would close the pool under
// the other requests in flight. Scripts import this after loadEnv() (dynamic import).
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.POSTGRES_URL! }) });

// Reuse the client across dev hot reloads instead of opening a new pool each time.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
