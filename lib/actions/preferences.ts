"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userPreferences, notificationPreferences, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import {
  learningPreferencesSchema,
  notificationPreferencesSchema,
  profileSchema,
} from "@/lib/validation/preferences";
import type { ActionResult } from "./auth";

function normalizeTime(value: string | undefined): string | null {
  return value ? value : null;
}

/**
 * Called once from /onboarding. Writes the learner's chosen level, goals,
 * daily target, and reminder time, and stamps `onboardingCompletedAt` —
 * that stamp is what (app)/layout.tsx checks to decide whether a signed-in
 * user still needs to be routed through onboarding.
 */
export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = learningPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { cefrLevel, learningGoals, dailyWordTarget, reminderTime, timezone } = parsed.data;

  await db
    .update(userPreferences)
    .set({
      cefrLevel,
      learningGoals,
      dailyWordTarget,
      reminderTime: normalizeTime(reminderTime),
      timezone,
      onboardingCompletedAt: new Date(),
    })
    .where(eq(userPreferences.userId, user.id));

  return { success: true };
}

/** Settings page: editing learning preferences after onboarding is already done. */
export async function updateLearningPreferences(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = learningPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { cefrLevel, learningGoals, dailyWordTarget, reminderTime, timezone } = parsed.data;

  await db
    .update(userPreferences)
    .set({
      cefrLevel,
      learningGoals,
      dailyWordTarget,
      reminderTime: normalizeTime(reminderTime),
      timezone,
    })
    .where(eq(userPreferences.userId, user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function updateNotificationPreferences(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { secondReminderTime, ...rest } = parsed.data;

  await db
    .update(notificationPreferences)
    .set({ ...rest, secondReminderTime: normalizeTime(secondReminderTime) })
    .where(eq(notificationPreferences.userId, user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, user.id));

  revalidatePath("/settings");
  return { success: true };
}
