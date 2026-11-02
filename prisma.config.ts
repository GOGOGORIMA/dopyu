import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 does not load .env by itself, so dotenv is imported above.
// The fallback lets `npm run db:setup` work right after cloning, without a .env file.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
