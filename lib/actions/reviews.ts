"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import type { ReviewMode, Rating } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { applySrsOutcome } from "@/lib/db/mutations/apply-srs-outcome";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { incrementReviewsCompletedToday } from "@/lib/db/queries/daily";
import type { ActionResult } from "./auth";

/** Records one flashcard/quick-review answer — see applySrsOutcome for the scheduling/mastery/weak logic. */
export async function submitReview(
  userWordId: string,
  mode: ReviewMode,
  rating: Rating,
): Promise<ActionResult> {
  const user = await requireUser();

  const outcome = await applySrsOutcome(user.id, userWordId, rating);
  if (!outcome) return { success: false, error: "Word not found." };

  await db.insert(reviews).values({
    userId: user.id,
    userWordId,
    mode,
    rating,
    wasCorrect: outcome.wasCorrect,
    intervalBeforeDays: outcome.intervalBeforeDays,
    intervalAfterDays: outcome.intervalAfterDays,
    reviewedAt: new Date(),
  });

  const preferences = await getUserPreferences(user.id);
  await incrementReviewsCompletedToday(
    user.id,
    preferences?.timezone ?? "UTC",
    preferences?.dailyWordTarget ?? 2,
  );

  revalidatePath("/vocabulary");
  revalidatePath("/dashboard");
  return { success: true };
}
