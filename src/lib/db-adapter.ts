import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Prisma driver adapter (Prisma 7 connects to the DB through one).
 * Shared by the app (src/lib/prisma.ts) and the seed (prisma/seed.ts).
 *
 * To move to PostgreSQL, rewrite this function as follows (see README for details):
 *   import { PrismaPg } from "@prisma/adapter-pg";
 *   return new PrismaPg({ connectionString: process.env.DATABASE_URL });
 */
export function createDriverAdapter() {
  return new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
}
