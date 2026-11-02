import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { createDriverAdapter } from "./db-adapter";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse a single client across hot reloads in development.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createDriverAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
