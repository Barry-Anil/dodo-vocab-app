import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyEntries, dailyWordEntries, userStreaks } from "@/db/schema";
import { previousDateString, todayInTimezone } from "@/lib/date";

export async function getOrCreateDailyEntry(userId: string, date: string, wordsTarget: number) {
  const [existing] = await db
    .select()
    .from(dailyEntries)
    .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, date)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(dailyEntries)
    .values({ userId, date, wordsTarget })
    .onConflictDoNothing({ target: [dailyEntries.userId, dailyEntries.date] })
    .returning();

  // Conflict path (a concurrent request created it first) — fetch what's there.
  if (!created) {
    const [row] = await db
      .select()
      .from(dailyEntries)
      .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, date)))
      .limit(1);
    return row;
  }
  return created;
}

function statusFor(wordsAdded: number, wordsTarget: number): "NOT_STARTED" | "PARTIAL" | "COMPLETE" {
  if (wordsAdded <= 0) return "NOT_STARTED";
  if (wordsAdded >= wordsTarget) return "COMPLETE";
  return "PARTIAL";
}

/**
 * Called whenever a user adds a word — links it to today's daily_entries
 * row, recomputes that day's status, and (only on the transition into
 * COMPLETE) advances the streak. Recomputing wordsAdded via COUNT rather
 * than incrementing a counter keeps this idempotent against retries.
 */
export async function recordWordAddedToday(
  userId: string,
  userWordId: string,
  timezone: string,
  dailyTarget: number,
  today: string,
) {
  const entry = await getOrCreateDailyEntry(userId, today, dailyTarget);
  if (!entry) return;

  const wasComplete = entry.status === "COMPLETE";

  await db
    .insert(dailyWordEntries)
    .values({ dailyEntryId: entry.id, userWordId })
    .onConflictDoNothing({ target: [dailyWordEntries.dailyEntryId, dailyWordEntries.userWordId] });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dailyWordEntries)
    .where(eq(dailyWordEntries.dailyEntryId, entry.id));

  const wordsAdded = Number(count);
  const status = statusFor(wordsAdded, entry.wordsTarget);

  await db.update(dailyEntries).set({ wordsAdded, status }).where(eq(dailyEntries.id, entry.id));

  if (!wasComplete && status === "COMPLETE") {
    await advanceStreak(userId, today);
  }

  return { wordsAdded, target: entry.wordsTarget, status };
}

async function advanceStreak(userId: string, today: string) {
  const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  if (!streak) return;

  if (streak.lastActiveDate === today) return; // already counted today

  const isConsecutive = streak.lastActiveDate === previousDateString(today);
  const nextCurrent = isConsecutive ? streak.currentStreak + 1 : 1;

  await db
    .update(userStreaks)
    .set({
      currentStreak: nextCurrent,
      longestStreak: Math.max(streak.longestStreak, nextCurrent),
      lastActiveDate: today,
    })
    .where(eq(userStreaks.id, streak.id));
}

/** Called on every submitted review — bumps today's reviewsCompleted count. */
export async function incrementReviewsCompletedToday(userId: string, timezone: string, dailyTarget: number) {
  const today = todayInTimezone(timezone);
  const entry = await getOrCreateDailyEntry(userId, today, dailyTarget);
  if (!entry) return;
  await db
    .update(dailyEntries)
    .set({ reviewsCompleted: entry.reviewsCompleted + 1 })
    .where(eq(dailyEntries.id, entry.id));
}

export async function markQuizCompletedToday(userId: string, timezone: string, dailyTarget: number) {
  const today = todayInTimezone(timezone);
  const entry = await getOrCreateDailyEntry(userId, today, dailyTarget);
  if (!entry) return;
  await db.update(dailyEntries).set({ quizCompleted: true }).where(eq(dailyEntries.id, entry.id));
}

export async function getStreak(userId: string) {
  const [row] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  return row ?? null;
}

export async function getTodayEntry(userId: string, today: string) {
  const [row] = await db
    .select()
    .from(dailyEntries)
    .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, today)))
    .limit(1);
  return row ?? null;
}

/** Month range (inclusive) for the calendar page — `start`/`end` as YYYY-MM-DD. */
export async function getDailyEntriesInRange(userId: string, start: string, end: string) {
  return db
    .select()
    .from(dailyEntries)
    .where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, start), lte(dailyEntries.date, end)))
    .orderBy(dailyEntries.date);
}
