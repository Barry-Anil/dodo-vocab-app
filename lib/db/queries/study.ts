import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { addDays } from "@/lib/date";

export interface DailyStudyTotal {
  /** YYYY-MM-DD */
  date: string;
  seconds: number;
  sessions: number;
}

/**
 * Focused seconds per day between `start` and `end` (inclusive, YYYY-MM-DD),
 * oldest first. Days with no sessions are omitted — callers that need a dense
 * series fill the gaps themselves.
 */
export async function getDailyStudyTotals(
  userId: string,
  start: string,
  end: string,
): Promise<DailyStudyTotal[]> {
  const rows = await db
    .select({
      date: studySessions.date,
      seconds: sql<number>`coalesce(sum(${studySessions.durationSeconds}), 0)`,
      sessions: sql<number>`count(*)`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        gte(studySessions.date, start),
        lte(studySessions.date, end),
      ),
    )
    .groupBy(studySessions.date)
    .orderBy(studySessions.date);

  return rows.map((r) => ({
    date: r.date,
    seconds: Number(r.seconds),
    sessions: Number(r.sessions),
  }));
}

export interface StudyOverview {
  todaySeconds: number;
  todaySessions: number;
  weekSeconds: number;
  monthSeconds: number;
  allTimeSeconds: number;
  /** Consecutive days ending today (or yesterday) with any focused time. */
  streak: number;
}

export async function getStudyOverview(userId: string, today: string): Promise<StudyOverview> {
  const weekStart = addDays(today, -6);
  const monthStart = addDays(today, -29);

  const [agg] = await db
    .select({
      todaySeconds: sql<number>`coalesce(sum(${studySessions.durationSeconds}) filter (where ${studySessions.date} = ${today}), 0)`,
      todaySessions: sql<number>`count(*) filter (where ${studySessions.date} = ${today})`,
      weekSeconds: sql<number>`coalesce(sum(${studySessions.durationSeconds}) filter (where ${studySessions.date} >= ${weekStart}), 0)`,
      monthSeconds: sql<number>`coalesce(sum(${studySessions.durationSeconds}) filter (where ${studySessions.date} >= ${monthStart}), 0)`,
      allTimeSeconds: sql<number>`coalesce(sum(${studySessions.durationSeconds}), 0)`,
    })
    .from(studySessions)
    .where(eq(studySessions.userId, userId));

  // Study streak — pull the distinct active days from the last ~2 months and
  // walk backwards from today.
  const activeDays = await db
    .selectDistinct({ date: studySessions.date })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), gte(studySessions.date, addDays(today, -70))))
    .orderBy(studySessions.date);

  const activeSet = new Set(activeDays.map((d) => d.date));
  let streak = 0;
  // Allow the streak to still "count" if today has no session yet but
  // yesterday did — the day isn't over.
  let cursor = activeSet.has(today) ? today : addDays(today, -1);
  while (activeSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    todaySeconds: Number(agg?.todaySeconds ?? 0),
    todaySessions: Number(agg?.todaySessions ?? 0),
    weekSeconds: Number(agg?.weekSeconds ?? 0),
    monthSeconds: Number(agg?.monthSeconds ?? 0),
    allTimeSeconds: Number(agg?.allTimeSeconds ?? 0),
    streak,
  };
}
