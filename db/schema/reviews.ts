import { boolean, index, integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";
import { learningSessionTypeEnum, ratingEnum, reviewModeEnum } from "./enums";
import { users } from "./auth";
import { userWords } from "./user-words";

/**
 * A composed "Start Learning" (or flashcards/quick-review/quiz) session —
 * spec §28. The system decides what belongs in it; this row just tracks
 * that a session happened and how much of it was completed.
 */
export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionType: learningSessionTypeEnum("session_type").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    wordsPlanned: integer("words_planned"),
    wordsCompleted: integer("words_completed").notNull().default(0),
    estimatedMinutes: integer("estimated_minutes"),
    createdAt,
  },
  (t) => [index("learning_sessions_user_id_idx").on(t.userId)],
);

export const flashcardSessions = pgTable(
  "flashcard_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    learningSessionId: uuid("learning_session_id").references(() => learningSessions.id, {
      onDelete: "set null",
    }),
    mode: reviewModeEnum("mode").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cardsTotal: integer("cards_total").notNull().default(0),
    cardsCompleted: integer("cards_completed").notNull().default(0),
    createdAt,
  },
  (t) => [index("flashcard_sessions_user_id_idx").on(t.userId)],
);

/**
 * Append-only event log — every spaced-repetition scheduling decision
 * derives from these rows. `rating` is set for rated flashcard reviews
 * (Again/Hard/Good/Easy); `wasCorrect` covers non-rating modes (typing,
 * multiple choice, quick review).
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userWordId: uuid("user_word_id")
      .notNull()
      .references(() => userWords.id, { onDelete: "cascade" }),
    flashcardSessionId: uuid("flashcard_session_id").references(() => flashcardSessions.id, {
      onDelete: "set null",
    }),
    mode: reviewModeEnum("mode").notNull(),
    rating: ratingEnum("rating"),
    wasCorrect: boolean("was_correct"),
    responseTimeMs: integer("response_time_ms"),
    intervalBeforeDays: real("interval_before_days"),
    intervalAfterDays: real("interval_after_days"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (t) => [
    index("reviews_user_word_idx").on(t.userWordId),
    index("reviews_user_reviewed_at_idx").on(t.userId, t.reviewedAt),
  ],
);

/**
 * Sub-attempts within a single review round (e.g. typing mode retried until
 * correct, or matching mode's several pairs) without overloading `reviews`.
 */
export const reviewAttempts = pgTable(
  "review_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    userAnswer: text("user_answer"),
    isCorrect: boolean("is_correct"),
    createdAt,
  },
  (t) => [index("review_attempts_review_id_idx").on(t.reviewId)],
);
