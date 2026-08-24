import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences, notificationPreferences } from "@/db/schema";

export async function getUserPreferences(userId: string) {
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getNotificationPreferences(userId: string) {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Whether the user still needs to go through /onboarding. */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const preferences = await getUserPreferences(userId);
  return !preferences?.onboardingCompletedAt;
}
