import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { wordStatusEnum } from "./enums";
import { users } from "./auth";
import { words } from "./words";

/**
 * One row per (user, word) — the mastery/spaced-repetition core, and the
 * privacy boundary: `words` is shared/canonical, but everything about a
 * user's relationship to a word lives here and nowhere else.
 *
 * Scheduling fields (intervalDays/easeFactor/repetitionNumber) are named
 * algorithm-neutrally — see lib/srs/algorithm.ts — so a future FSRS swap
 * can reinterpret them without a disruptive migration.
 */
export const userWords = pgTable(
  "user_words",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),

    status: wordStatusEnum("status").notNull().default("NEW"),

    // Usage stats
    timesSeen: integer("times_seen").notNull().default(0),
    timesCorrect: integer("times_correct").notNull().default(0),
    timesWrong: integer("times_wrong").notNull().default(0),
    consecutiveCorrect: integer("consecutive_correct").notNull().default(0),
    consecutiveWrong: integer("consecutive_wrong").notNull().default(0),

    // Scheduling — generic fields usable by SM-2 now, FSRS later.
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    intervalDays: real("interval_days").notNull().default(0),
    easeFactor: real("ease_factor").notNull().default(2.5),
    repetitionNumber: integer("repetition_number").notNull().default(0),

    // Derived/summary scores driving UI + weak-word detection.
    difficulty: real("difficulty"),
    confidence: real("confidence"),
    masteryScore: real("mastery_score").notNull().default(0),

    // Explicit flag for O(index) weak-word carry-over queries (spec §17) —
    // set/cleared by application logic, never removed after a single
    // correct answer (requires sustained accuracy — see algorithm.ts).
    isWeak: boolean("is_weak").notNull().default(false),
    weakSince: timestamp("weak_since", { withTimezone: true }),
    markedMasteredAt: timestamp("marked_mastered_at", { withTimezone: true }),

    isFavorite: boolean("is_favorite").notNull().default(false),
    notes: text("notes"),

    firstLearnedAt: timestamp("first_learned_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("user_words_user_word_unique").on(t.userId, t.wordId),
    // "Due for review": WHERE user_id = ? AND next_review_at <= now()
    index("user_words_due_idx").on(t.userId, t.nextReviewAt),
    index("user_words_status_idx").on(t.userId, t.status),
    index("user_words_weak_idx").on(t.userId, t.isWeak),
    index("user_words_favorite_idx").on(t.userId, t.isFavorite),
    index("user_words_word_id_idx").on(t.wordId),
  ],
);
