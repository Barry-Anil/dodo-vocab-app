import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyEntries, dailyWordEntries, userWords, words } from "@/db/schema";
import { getDailyEntriesInRange } from "./daily";

/** YYYY-MM-DD for the first and last day of the given YYYY-MM month string. */
export function monthRange(monthStr: string): { start: string; end: string; year: number; month: number } {
  const [year, month] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, year, month };
}

export async function getMonthEntries(userId: string, monthStr: string) {
  const { start, end } = monthRange(monthStr);
  const entries = await getDailyEntriesInRange(userId, start, end);
  return new Map(entries.map((e) => [e.date, e]));
}

export async function getDayDetail(userId: string, date: string) {
  const [entry] = await db
    .select()
    .from(dailyEntries)
    .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, date)))
    .limit(1);

  if (!entry) return { entry: null, wordsAdded: [] };

  const wordsAdded = await db
    .select({ word: words, userWord: userWords })
    .from(dailyWordEntries)
    .innerJoin(userWords, eq(dailyWordEntries.userWordId, userWords.id))
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(eq(dailyWordEntries.dailyEntryId, entry.id));

  return { entry, wordsAdded };
}
