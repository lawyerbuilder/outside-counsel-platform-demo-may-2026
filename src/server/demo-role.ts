import { cookies } from "next/headers";
import { prisma } from "@/server/db";

export type DemoRole = "LAWYER" | "MANAGER" | "ADMIN";

const ROLE_COOKIE = "demo-role";

/**
 * Demo role switching: the active role is a cookie set by the topbar
 * switcher. Defaults to MANAGER (full main-nav visibility). Replace with
 * real session roles when NextAuth logins go live.
 */
export async function getDemoRole(): Promise<DemoRole> {
  const store = await cookies();
  const value = store.get(ROLE_COOKIE)?.value;
  if (value === "LAWYER" || value === "MANAGER" || value === "ADMIN") return value;
  return "MANAGER";
}

const roleEmail: Record<DemoRole, string> = {
  LAWYER: "sarah.scales@example.com",
  MANAGER: "manager@example.com",
  ADMIN: "admin@example.com",
};

/** The seeded user corresponding to the active demo role */
export async function getDemoUser() {
  const role = await getDemoRole();
  const user = await prisma.user.findFirst({ where: { email: roleEmail[role] } });
  if (user) return user;
  // Fallback for databases without the seeded demo users
  const any = await prisma.user.findFirst();
  if (!any) throw new Error("No users in database");
  return any;
}

export function canSee(role: DemoRole, area: "panel" | "insights" | "admin"): boolean {
  switch (area) {
    case "panel":
    case "insights":
      return role === "MANAGER" || role === "ADMIN";
    case "admin":
      return role === "ADMIN";
  }
}
