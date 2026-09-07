import { boolean, date, index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";
import { users } from "./auth";

/**
 * One row per Pomodoro focus interval the learner actually sat through
 * (completed or ended early). Break intervals are never recorded — this
 * table is "time spent studying", nothing else.
 *
 * `date` is the learner's local calendar date (see lib/date.ts), stored
 * denormalized so the Study Timer page can sum minutes-per-day with a plain
 * indexed range query instead of bucketing timestamps by timezone at read
 * time — the same pattern daily_entries uses.
 */
export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    // Focused seconds credited for this interval.
    durationSeconds: integer("duration_seconds").notNull(),
    // The interval length the user had configured — durationSeconds is lower
    // when they stopped early. Kept for "average session length" style stats.
    plannedSeconds: integer("planned_seconds").notNull(),
    endedEarly: boolean("ended_early").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [index("study_sessions_user_date_idx").on(t.userId, t.date)],
);
