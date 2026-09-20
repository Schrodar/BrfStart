import { PrismaClient } from "@prisma/client";

/**
 * Prisma-klient som återanvänds mellan hot-reloads i dev (sparas på globalThis)
 * så att antalet databasanslutningar inte skenar.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
