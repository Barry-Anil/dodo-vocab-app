"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { words, userWords, wordCategories } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getAIService, AIRateLimitError, AIValidationError } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";
import { normalizeWordText, findWordByNormalizedText, getUserWord } from "@/lib/db/queries/words";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { recordWordAddedToday, getTodayEntry } from "@/lib/db/queries/daily";
import { todayInTimezone } from "@/lib/date";
import type { ActionResult } from "./auth";

export interface AddWordOutcome {
  wordId: string;
  text: string;
  status: "added" | "already_in_bank";
  error?: string;
}

export interface AddWordsResult {
  success: true;
  outcomes: AddWordOutcome[];
  /** True if this batch is what pushed today's word goal from incomplete to complete — the UI fires a celebratory toast on this. */
  dailyGoalJustCompleted: boolean;
}

/**
 * Looks up (or AI-generates + caches) the canonical word row, then ensures
 * a user_words row exists for the current user, then records it against
 * today's daily progress. A word already existing canonically (added by
 * any user, ever) skips the AI call entirely — that's the shared-word
 * cache/dedup design from Phase 1's schema.
 */
async function addOneWord(userId: string, rawText: string): Promise<AddWordOutcome> {
  const text = rawText.trim();
  const textNormalized = normalizeWordText(text);
  if (!textNormalized) {
    return { wordId: "", text, status: "already_in_bank", error: "Empty word." };
  }

  let word = await findWordByNormalizedText(textNormalized);

  if (!word || !word.aiGeneratedAt) {
    try {
      await assertWithinRateLimit(userId, "word_details");
      const details = await getAIService().generateWordDetails({ word: text }, { userId });

      if (word) {
        [word] = await db
          .update(words)
          .set({ ...details, text, aiGeneratedAt: new Date(), updatedAt: new Date() })
          .where(eq(words.id, word.id))
          .returning();
      } else {
        [word] = await db
          .insert(words)
          .values({ text, textNormalized, ...details, aiGeneratedAt: new Date(), sourceType: "ai" })
          .onConflictDoNothing({ target: words.textNormalized })
          .returning();
        // Lost an insert race to another concurrent request — fetch what won.
        if (!word) word = await findWordByNormalizedText(textNormalized);
      }
    } catch (error) {
      if (error instanceof AIRateLimitError) {
        return { wordId: "", text, status: "already_in_bank", error: error.message };
      }
      if (error instanceof AIValidationError) {
        return {
          wordId: "",
          text,
          status: "already_in_bank",
          error: "Couldn't generate details for this word. Try again.",
        };
      }
      throw error;
    }
  }

  if (!word) {
    return { wordId: "", text, status: "already_in_bank", error: "Something went wrong. Try again." };
  }

  const existingUserWord = await getUserWord(userId, word.id);
  if (existingUserWord) {
    return { wordId: word.id, text: word.text, status: "already_in_bank" };
  }

  const [userWord] = await db
    .insert(userWords)
    .values({ userId, wordId: word.id, status: "NEW", firstLearnedAt: new Date() })
    .returning();

  const preferences = await getUserPreferences(userId);
  const timezone = preferences?.timezone ?? "UTC";
  const dailyTarget = preferences?.dailyWordTarget ?? 2;
  await recordWordAddedToday(userId, userWord.id, timezone, dailyTarget, todayInTimezone(timezone));

  return { wordId: word.id, text: word.text, status: "added" };
}

const MAX_WORDS_PER_BATCH = 10;

/** Accepts either a single word or a newline/comma-separated batch (spec §7: add one or many at once). */
export async function addWords(input: unknown): Promise<AddWordsResult | { success: false; error: string }> {
  const user = await requireUser();

  if (typeof input !== "object" || input === null || !("text" in input) || typeof input.text !== "string") {
    return { success: false, error: "Invalid input." };
  }

  const rawWords = input.text
    .split(/[\n,]/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (rawWords.length === 0) {
    return { success: false, error: "Enter at least one word." };
  }
  if (rawWords.length > MAX_WORDS_PER_BATCH) {
    return { success: false, error: `Add at most ${MAX_WORDS_PER_BATCH} words at once.` };
  }

  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";
  const today = todayInTimezone(timezone);
  const wasCompleteBefore = (await getTodayEntry(user.id, today))?.status === "COMPLETE";

  const outcomes: AddWordOutcome[] = [];
  for (const raw of rawWords) {
    outcomes.push(await addOneWord(user.id, raw));
  }

  const isCompleteAfter = (await getTodayEntry(user.id, today))?.status === "COMPLETE";

  revalidatePath("/vocabulary");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return {
    success: true,
    outcomes,
    dailyGoalJustCompleted: !wasCompleteBefore && isCompleteAfter,
  };
}

export async function toggleFavorite(userWordId: string): Promise<ActionResult> {
  const user = await requireUser();

  const [row] = await db
    .select({ isFavorite: userWords.isFavorite })
    .from(userWords)
    .where(and(eq(userWords.id, userWordId), eq(userWords.userId, user.id)))
    .limit(1);
  if (!row) return { success: false, error: "Word not found." };

  await db
    .update(userWords)
    .set({ isFavorite: !row.isFavorite })
    .where(eq(userWords.id, userWordId));

  revalidatePath("/vocabulary");
  return { success: true };
}

/** Manual override — the user can mark a word known outright without going through review. */
export async function markWordKnown(userWordId: string): Promise<ActionResult> {
  const user = await requireUser();

  const result = await db
    .update(userWords)
    .set({ status: "MASTERED", masteryScore: 100, markedMasteredAt: new Date(), isWeak: false })
    .where(and(eq(userWords.id, userWordId), eq(userWords.userId, user.id)))
    .returning({ id: userWords.id });

  if (result.length === 0) return { success: false, error: "Word not found." };
  revalidatePath("/vocabulary");
  return { success: true };
}

export async function markForReviewLater(userWordId: string): Promise<ActionResult> {
  const user = await requireUser();

  const result = await db
    .update(userWords)
    .set({ status: "REVIEW", nextReviewAt: new Date() })
    .where(and(eq(userWords.id, userWordId), eq(userWords.userId, user.id)))
    .returning({ id: userWords.id });

  if (result.length === 0) return { success: false, error: "Word not found." };
  revalidatePath("/vocabulary");
  return { success: true };
}

export async function updateWordNotes(userWordId: string, notes: string): Promise<ActionResult> {
  const user = await requireUser();

  const result = await db
    .update(userWords)
    .set({ notes: notes.trim() || null })
    .where(and(eq(userWords.id, userWordId), eq(userWords.userId, user.id)))
    .returning({ id: userWords.id });

  if (result.length === 0) return { success: false, error: "Word not found." };
  return { success: true };
}

export async function removeWordFromBank(userWordId: string): Promise<ActionResult> {
  const user = await requireUser();

  const result = await db
    .delete(userWords)
    .where(and(eq(userWords.id, userWordId), eq(userWords.userId, user.id)))
    .returning({ id: userWords.id });

  if (result.length === 0) return { success: false, error: "Word not found." };
  revalidatePath("/vocabulary");
  return { success: true };
}

export async function setWordCategories(wordId: string, categoryIds: string[]): Promise<ActionResult> {
  const user = await requireUser();

  await db.delete(wordCategories).where(and(eq(wordCategories.wordId, wordId), eq(wordCategories.userId, user.id)));

  if (categoryIds.length > 0) {
    await db
      .insert(wordCategories)
      .values(categoryIds.map((categoryId) => ({ wordId, categoryId, userId: user.id })));
  }

  revalidatePath(`/vocabulary/${wordId}`);
  revalidatePath("/vocabulary");
  return { success: true };
}
