import { pgEnum } from "drizzle-orm/pg-core";

/**
 * All pgEnum definitions live here and are imported by the table files that
 * need them. Centralizing avoids duplicate Postgres enum-type declarations
 * when the same enum is referenced from multiple schema files.
 */

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const cefrLevelEnum = pgEnum("cefr_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);

export const partOfSpeechEnum = pgEnum("part_of_speech", [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "phrase",
  "other",
]);

export const wordSourceEnum = pgEnum("word_source", ["ai", "manual", "extracted"]);

export const wordStatusEnum = pgEnum("word_status", ["NEW", "LEARNING", "REVIEW", "MASTERED"]);

export const dailyStatusEnum = pgEnum("daily_status", [
  "NOT_STARTED",
  "PARTIAL",
  "COMPLETE",
  "MISSED",
]);

export const reviewModeEnum = pgEnum("review_mode", [
  "flashcard_front_back",
  "flashcard_back_front",
  "flashcard_meaning_to_word",
  "flashcard_word_to_meaning",
  "flashcard_fill_blank",
  "flashcard_synonym_challenge",
  "flashcard_antonym_challenge",
  "quick_review",
]);

export const ratingEnum = pgEnum("rating", ["again", "hard", "good", "easy"]);

export const quizTypeEnum = pgEnum("quiz_type", ["weekly", "adaptive", "quick", "custom"]);

export const quizStatusEnum = pgEnum("quiz_status", [
  "pending",
  "in_progress",
  "completed",
  "expired",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "meaning_identification",
  "synonym",
  "antonym",
  "fill_blank",
  "sentence_selection",
  "word_matching",
  "reverse_recall",
  "typing",
  "contextual_usage",
]);

export const learningSessionTypeEnum = pgEnum("learning_session_type", [
  "start_learning",
  "flashcards",
  "quick_review",
  "quiz",
  "manual",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "daily_reminder",
  "review_due",
  "streak_risk",
  "weekly_report",
  "weekly_quiz",
  "achievement",
  "system",
]);

export const aiTaskTypeEnum = pgEnum("ai_task_type", [
  "word_details",
  "image_generation",
  "quiz_generation",
  "question_generation",
  "weekly_report",
  "recommendations",
  "sentence_evaluation",
  "text_extraction",
]);

export const aiStatusEnum = pgEnum("ai_status", [
  "pending",
  "success",
  "failed",
  "invalid_response",
]);

// Convenience TS types for the enum value unions, reused across queries/actions/UI.
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type WordStatus = (typeof wordStatusEnum.enumValues)[number];
export type DailyStatus = (typeof dailyStatusEnum.enumValues)[number];
export type ReviewMode = (typeof reviewModeEnum.enumValues)[number];
export type Rating = (typeof ratingEnum.enumValues)[number];
export type QuizType = (typeof quizTypeEnum.enumValues)[number];
export type QuizStatus = (typeof quizStatusEnum.enumValues)[number];
export type QuestionType = (typeof questionTypeEnum.enumValues)[number];
