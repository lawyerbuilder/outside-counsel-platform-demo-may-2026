import { prisma } from "./db";

/**
 * Temporary auth stub — returns the first LAWYER user as the current user.
 * Will be replaced with NextAuth.js session lookup in a later phase.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({
    where: { role: "LAWYER", deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!user) throw new Error("No user found — run the seed script first");
  return user;
}
