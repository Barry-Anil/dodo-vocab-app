import { boolean, date, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { questionTypeEnum, quizStatusEnum, quizTypeEnum } from "./enums";
import { users } from "./auth";
import { userWords } from "./user-words";
import { words } from "./words";
import { aiGenerations } from "./ai";

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: quizTypeEnum("type").notNull(),
    title: text("title"),
    // Set for type = 'weekly'; unique constraint below enforces one weekly
    // quiz per user per week.
    weekStartDate: date("week_start_date"),
    status: quizStatusEnum("status").notNull().default("pending"),
    totalQuestions: integer("total_questions").notNull().default(0),
    score: real("score"),
    aiGenerationId: uuid("ai_generation_id").references(() => aiGenerations.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("quizzes_user_id_idx").on(t.userId),
    uniqueIndex("quizzes_user_week_unique").on(t.userId, t.weekStartDate),
  ],
);

/**
 * `userWordId` links every generated question back to the specific
 * per-user progress row it's testing — the structural link that makes
 * weak-word carry-over (spec §17) and adaptive quizzing (spec §18)
 * possible: a wrong answer here updates that same `user_words` row that a
 * failed flashcard review would update.
 */
export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userWordId: uuid("user_word_id").references(() => userWords.id, { onDelete: "cascade" }),
    wordId: uuid("word_id").references(() => words.id, { onDelete: "set null" }),
    questionType: questionTypeEnum("question_type").notNull(),
    questionText: text("question_text").notNull(),
    options: jsonb("options").$type<string[]>(),
    correctAnswer: text("correct_answer").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    // Snapshot of user_words.difficulty at question-creation time — lets
    // adaptive-question logic look back at what difficulty a word was when
    // tested without re-deriving it from history.
    difficultyAtCreation: real("difficulty_at_creation"),
    createdAt,
  },
  (t) => [
    index("quiz_questions_quiz_id_idx").on(t.quizId),
    index("quiz_questions_user_word_idx").on(t.userWordId),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    score: real("score"),
    createdAt,
  },
  (t) => [
    index("quiz_attempts_quiz_id_idx").on(t.quizId),
    index("quiz_attempts_user_id_idx").on(t.userId),
  ],
);

export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizAttemptId: uuid("quiz_attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    quizQuestionId: uuid("quiz_question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    userAnswer: text("user_answer"),
    isCorrect: boolean("is_correct").notNull(),
    responseTimeMs: integer("response_time_ms"),
    createdAt,
  },
  (t) => [
    index("quiz_answers_attempt_id_idx").on(t.quizAttemptId),
    index("quiz_answers_question_id_idx").on(t.quizQuestionId),
  ],
);
