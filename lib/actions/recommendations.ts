"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userWords, words } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { getAIService, AIRateLimitError, AIValidationError } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";
import type { Recommendations } from "@/lib/ai/types";

export type RecommendationsResult =
  | { success: true; recommendations: Recommendations }
  | { success: false; error: string };

/**
 * On-demand, not auto-loaded on every dashboard visit — recommendations
 * aren't in the "permanently cacheable" AI task set (they should reflect
 * current state), so this is a real API call every time; gating it behind
 * a user click keeps AI spend proportional to actual usage (spec §32).
 */
export async function getWordRecommendations(): Promise<RecommendationsResult> {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);

  const knownWords = await db
    .select({ text: words.text })
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(eq(userWords.userId, user.id));

  try {
    await assertWithinRateLimit(user.id, "recommendations");
    const recommendations = await getAIService().generateRecommendations(
      {
        userId: user.id,
        level: preferences?.cefrLevel ?? "B1",
        goals: preferences?.learningGoals ?? [],
        knownWords: knownWords.map((w) => w.text),
        weakCategories: [],
        count: 5,
      },
      { userId: user.id },
    );
    return { success: true, recommendations };
  } catch (error) {
    if (error instanceof AIRateLimitError) return { success: false, error: error.message };
    if (error instanceof AIValidationError) {
      return { success: false, error: "Couldn't generate recommendations right now. Try again." };
    }
    throw error;
  }
}
