import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { userWords, words } from "@/db/schema";
import { getUserPreferences } from "./preferences";
import { getStreak, getTodayEntry } from "./daily";
import { getWordBankStats } from "./words";
import { todayInTimezone } from "@/lib/date";

export async function getDashboardData(userId: string) {
  const preferences = await getUserPreferences(userId);
  const timezone = preferences?.timezone ?? "UTC";
  const dailyTarget = preferences?.dailyWordTarget ?? 2;
  const today = todayInTimezone(timezone);

  const [todayEntry, streak, bankStats, recentRows, weakRows, dueRows] = await Promise.all([
    getTodayEntry(userId, today),
    getStreak(userId),
    getWordBankStats(userId),
    db
      .select({ userWord: userWords, word: words })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(eq(userWords.userId, userId))
      .orderBy(desc(userWords.createdAt))
      .limit(5),
    db
      .select({ userWord: userWords, word: words })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(and(eq(userWords.userId, userId), eq(userWords.isWeak, true)))
      .orderBy(desc(userWords.weakSince))
      .limit(5),
    db
      .select({ userWord: userWords, word: words })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(and(eq(userWords.userId, userId), lte(userWords.nextReviewAt, new Date())))
      .limit(1),
  ]);

  return {
    today: {
      wordsAdded: todayEntry?.wordsAdded ?? 0,
      wordsTarget: todayEntry?.wordsTarget ?? dailyTarget,
      status: todayEntry?.status ?? "NOT_STARTED",
    },
    streak: {
      current: streak?.currentStreak ?? 0,
      longest: streak?.longestStreak ?? 0,
    },
    bankStats,
    recentWords: recentRows,
    weakWords: weakRows,
    hasDueReviews: dueRows.length > 0,
    preferences,
  };
}
