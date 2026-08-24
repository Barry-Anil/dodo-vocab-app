import { boolean, date, index, integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { dailyStatusEnum } from "./enums";
import { users } from "./auth";
import { userWords } from "./user-words";

/**
 * One row per (user, calendar date). `status` is a denormalized summary,
 * recomputed by application code whenever wordsAdded/reviewsCompleted/
 * quizCompleted change, so the calendar month-view page is one indexed
 * range query instead of an on-the-fly aggregation.
 */
export const dailyEntries = pgTable(
  "daily_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    wordsTarget: integer("words_target").notNull(),
    wordsAdded: integer("words_added").notNull().default(0),
    reviewsCompleted: integer("reviews_completed").notNull().default(0),
    quizCompleted: boolean("quiz_completed").notNull().default(false),
    status: dailyStatusEnum("status").notNull().default("NOT_STARTED"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("daily_entries_user_date_unique").on(t.userId, t.date),
    index("daily_entries_user_date_idx").on(t.userId, t.date),
  ],
);

export const dailyWordEntries = pgTable(
  "daily_word_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dailyEntryId: uuid("daily_entry_id")
      .notNull()
      .references(() => dailyEntries.id, { onDelete: "cascade" }),
    userWordId: uuid("user_word_id")
      .notNull()
      .references(() => userWords.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [
    uniqueIndex("daily_word_entries_daily_user_word_unique").on(t.dailyEntryId, t.userWordId),
    index("daily_word_entries_daily_entry_idx").on(t.dailyEntryId),
  ],
);
