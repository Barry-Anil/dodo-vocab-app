import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { userWords, words } from "@/db/schema";

export type PracticeScope = "due" | "weak" | "favorites" | "new" | "all";

const dueCondition = or(lte(userWords.nextReviewAt, new Date()), isNull(userWords.nextReviewAt))!;

/** Flashcards page scope selector (spec §13: today's/weak/favorites/all/category). */
export async function getPracticeQueue(userId: string, scope: PracticeScope, limit = 20) {
  const conditions = [eq(userWords.userId, userId)];

  if (scope === "weak") conditions.push(eq(userWords.isWeak, true));
  else if (scope === "favorites") conditions.push(eq(userWords.isFavorite, true));
  else if (scope === "new") conditions.push(eq(userWords.status, "NEW"));
  else if (scope === "due") conditions.push(dueCondition);
  // scope === "all": no extra condition

  return db
    .select({ userWord: userWords, word: words })
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(...conditions))
    .orderBy(desc(userWords.isWeak), userWords.nextReviewAt)
    .limit(limit);
}

export interface QuickReviewMix {
  weak: Awaited<ReturnType<typeof getPracticeQueue>>;
  due: Awaited<ReturnType<typeof getPracticeQueue>>;
  recent: Awaited<ReturnType<typeof getPracticeQueue>>;
}

/**
 * Spec §15's "5-minute review": a deliberate mix, not just whatever's due —
 * a few weak words, a few due words, a couple of recently-learned words for
 * reinforcement. Deduped by userWordId so nothing appears twice.
 */
export async function getQuickReviewMix(userId: string): Promise<QuickReviewMix> {
  const seen = new Set<string>();

  const weak = (
    await db
      .select({ userWord: userWords, word: words })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(and(eq(userWords.userId, userId), eq(userWords.isWeak, true)))
      .orderBy(desc(userWords.weakSince))
      .limit(3)
  ).filter((r) => (seen.has(r.userWord.id) ? false : (seen.add(r.userWord.id), true)));

  const due = (
    await db
      .select({ userWord: userWords, word: words })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(and(eq(userWords.userId, userId), dueCondition))
      .orderBy(userWords.nextReviewAt)
      .limit(6)
  ).filter((r) => (seen.has(r.userWord.id) ? false : (seen.add(r.userWord.id), true)));

  const recent = (
    await db
      .select({ userWord: userWords, word: words })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(eq(userWords.userId, userId))
      .orderBy(desc(userWords.createdAt))
      .limit(6)
  ).filter((r) => (seen.has(r.userWord.id) ? false : (seen.add(r.userWord.id), true)));

  return {
    weak: weak.slice(0, 3),
    due: due.slice(0, 2),
    recent: recent.slice(0, 2),
  };
}

export async function countPracticeScope(userId: string, scope: PracticeScope): Promise<number> {
  const conditions = [eq(userWords.userId, userId)];
  if (scope === "weak") conditions.push(eq(userWords.isWeak, true));
  else if (scope === "favorites") conditions.push(eq(userWords.isFavorite, true));
  else if (scope === "new") conditions.push(eq(userWords.status, "NEW"));
  else if (scope === "due") conditions.push(dueCondition);

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userWords)
    .where(and(...conditions));
  return Number(row?.count ?? 0);
}
