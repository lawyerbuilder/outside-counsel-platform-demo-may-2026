import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // In production a missing DATABASE_URL must fail loudly: silently booting
  // against an empty local SQLite file looks like data loss to users.
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Refusing to fall back to a local SQLite file in production."
    );
  }
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const adapter = new PrismaLibSql({
    url,
    ...(authToken ? { authToken } : {}),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
