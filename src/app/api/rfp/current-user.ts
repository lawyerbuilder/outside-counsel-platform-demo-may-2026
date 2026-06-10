import { getDemoUser } from "@/server/demo-role";

export async function getCurrentUserId(): Promise<string> {
  const user = await getDemoUser();
  return user.id;
}
