import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query and error logs can contain failing query arguments, including
    // resume and cover-letter text. `withApiHandler` logs a sanitised
    // reference instead. Enable "query" only locally, with fake data.
    log: ["warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
