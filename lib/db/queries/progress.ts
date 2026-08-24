import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { userWords, reviews, quizzes, dailyWordEntries, dailyEntries, wordCategories, categories } from "@/db/schema";
import { getWordBankStats } from "./words";
import { getStreak } from "./daily";

export async function getProgressOverview(userId: string, today: string) {
  const bankStats = await getWordBankStats(userId);
  const streak = await getStreak(userId);

  const weekAgo = shiftDate(today, -7);
  const monthAgo = shiftDate(today, -30);

  const [{ weekCount }] = await db
    .select({ weekCount: sql<number>`count(*)` })
    .from(dailyWordEntries)
    .innerJoin(dailyEntries, eq(dailyWordEntries.dailyEntryId, dailyEntries.id))
    .where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, weekAgo)));

  const [{ monthCount }] = await db
    .select({ monthCount: sql<number>`count(*)` })
    .from(dailyWordEntries)
    .innerJoin(dailyEntries, eq(dailyWordEntries.dailyEntryId, dailyEntries.id))
    .where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, monthAgo)));

  const [reviewAccuracyRow] = await db
    .select({
      total: sql<number>`count(*)`,
      correct: sql<number>`count(*) filter (where ${reviews.wasCorrect} = true)`,
    })
    .from(reviews)
    .where(eq(reviews.userId, userId));

  const [quizAccuracyRow] = await db
    .select({ avgScore: sql<number | null>`avg(${quizzes.score})` })
    .from(quizzes)
    .where(and(eq(quizzes.userId, userId), eq(quizzes.status, "completed")));

  const reviewTotal = Number(reviewAccuracyRow?.total ?? 0);
  const reviewCorrect = Number(reviewAccuracyRow?.correct ?? 0);

  return {
    bankStats,
    streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
    wordsThisWeek: Number(weekCount ?? 0),
    wordsThisMonth: Number(monthCount ?? 0),
    reviewAccuracy: reviewTotal > 0 ? reviewCorrect / reviewTotal : null,
    quizAccuracy: quizAccuracyRow?.avgScore != null ? Number(quizAccuracyRow.avgScore) : null,
  };
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Words added per week, most recent `weeks` weeks (oldest first, for a left-to-right chart). */
export async function getWordsPerWeek(userId: string, today: string, weeks = 8) {
  const start = shiftDate(today, -7 * weeks);
  const rows = await db
    .select({ date: dailyEntries.date, count: sql<number>`count(${dailyWordEntries.userWordId})` })
    .from(dailyEntries)
    .leftJoin(dailyWordEntries, eq(dailyWordEntries.dailyEntryId, dailyEntries.id))
    .where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, start)))
    .groupBy(dailyEntries.date);

  const buckets: { label: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const bucketEnd = shiftDate(today, -7 * i);
    const bucketStart = shiftDate(bucketEnd, -6);
    const count = rows
      .filter((r) => r.date >= bucketStart && r.date <= bucketEnd)
      .reduce((sum, r) => sum + Number(r.count), 0);
    buckets.push({ label: bucketStart.slice(5), count });
  }
  return buckets;
}

export async function getMasteryDistribution(userId: string) {
  const rows = await db
    .select({ status: userWords.status, count: sql<number>`count(*)` })
    .from(userWords)
    .where(eq(userWords.userId, userId))
    .groupBy(userWords.status);

  const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  return {
    NEW: byStatus.NEW ?? 0,
    LEARNING: byStatus.LEARNING ?? 0,
    REVIEW: byStatus.REVIEW ?? 0,
    MASTERED: byStatus.MASTERED ?? 0,
  };
}

/** Review accuracy grouped by the categories each reviewed word belongs to. */
export async function getAccuracyByCategory(userId: string, limit = 6) {
  const rows = await db
    .select({
      name: categories.name,
      total: sql<number>`count(*)`,
      correct: sql<number>`count(*) filter (where ${reviews.wasCorrect} = true)`,
    })
    .from(reviews)
    .innerJoin(userWords, eq(reviews.userWordId, userWords.id))
    .innerJoin(wordCategories, and(eq(wordCategories.wordId, userWords.wordId), eq(wordCategories.userId, userId)))
    .innerJoin(categories, eq(wordCategories.categoryId, categories.id))
    .where(eq(reviews.userId, userId))
    .groupBy(categories.name)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows.map((r) => ({
    name: r.name,
    accuracy: Number(r.total) > 0 ? Number(r.correct) / Number(r.total) : 0,
    total: Number(r.total),
  }));
}
