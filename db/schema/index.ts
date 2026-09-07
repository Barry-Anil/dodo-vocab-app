import { relations } from "drizzle-orm";
import { users, passwordResetTokens } from "./auth";
import { userPreferences, notificationPreferences } from "./users";
import { words, categories, wordCategories } from "./words";
import { userWords } from "./user-words";
import { collections, collectionWords } from "./collections";
import { dailyEntries, dailyWordEntries } from "./daily";
import { learningSessions, flashcardSessions, reviews, reviewAttempts } from "./reviews";
import { quizzes, quizQuestions, quizAttempts, quizAnswers } from "./quizzes";
import { userStreaks } from "./streaks";
import { notifications } from "./notifications";
import { aiGenerations } from "./ai";
import { studySessions } from "./study";

export * from "./enums";
export * from "./_columns";
export * from "./auth";
export * from "./users";
export * from "./words";
export * from "./user-words";
export * from "./collections";
export * from "./daily";
export * from "./reviews";
export * from "./quizzes";
export * from "./streaks";
export * from "./notifications";
export * from "./ai";
export * from "./study";

/**
 * Relation definitions (Drizzle relational query API) enable ergonomic
 * `db.query.userWords.findMany({ with: { word: true } })`-style reads from
 * Phase 3 onward, on top of the same FKs already declared in the table
 * definitions above.
 */

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  notificationPreferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  streak: one(userStreaks, {
    fields: [users.id],
    references: [userStreaks.userId],
  }),
  userWords: many(userWords),
  collections: many(collections),
  customCategories: many(categories),
  passwordResetTokens: many(passwordResetTokens),
  dailyEntries: many(dailyEntries),
  learningSessions: many(learningSessions),
  flashcardSessions: many(flashcardSessions),
  reviews: many(reviews),
  quizzes: many(quizzes),
  notifications: many(notifications),
  studySessions: many(studySessions),
}));

export const wordsRelations = relations(words, ({ many }) => ({
  wordCategories: many(wordCategories),
  userWords: many(userWords),
  collectionWords: many(collectionWords),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  owner: one(users, { fields: [categories.userId], references: [users.id] }),
  wordCategories: many(wordCategories),
}));

export const wordCategoriesRelations = relations(wordCategories, ({ one }) => ({
  word: one(words, { fields: [wordCategories.wordId], references: [words.id] }),
  category: one(categories, { fields: [wordCategories.categoryId], references: [categories.id] }),
  user: one(users, { fields: [wordCategories.userId], references: [users.id] }),
}));

export const userWordsRelations = relations(userWords, ({ one, many }) => ({
  user: one(users, { fields: [userWords.userId], references: [users.id] }),
  word: one(words, { fields: [userWords.wordId], references: [words.id] }),
  reviews: many(reviews),
  dailyWordEntries: many(dailyWordEntries),
  quizQuestions: many(quizQuestions),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  owner: one(users, { fields: [collections.userId], references: [users.id] }),
  collectionWords: many(collectionWords),
}));

export const collectionWordsRelations = relations(collectionWords, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionWords.collectionId],
    references: [collections.id],
  }),
  word: one(words, { fields: [collectionWords.wordId], references: [words.id] }),
}));

export const dailyEntriesRelations = relations(dailyEntries, ({ one, many }) => ({
  user: one(users, { fields: [dailyEntries.userId], references: [users.id] }),
  wordEntries: many(dailyWordEntries),
}));

export const dailyWordEntriesRelations = relations(dailyWordEntries, ({ one }) => ({
  dailyEntry: one(dailyEntries, {
    fields: [dailyWordEntries.dailyEntryId],
    references: [dailyEntries.id],
  }),
  userWord: one(userWords, {
    fields: [dailyWordEntries.userWordId],
    references: [userWords.id],
  }),
}));

export const learningSessionsRelations = relations(learningSessions, ({ one, many }) => ({
  user: one(users, { fields: [learningSessions.userId], references: [users.id] }),
  flashcardSessions: many(flashcardSessions),
}));

export const flashcardSessionsRelations = relations(flashcardSessions, ({ one, many }) => ({
  user: one(users, { fields: [flashcardSessions.userId], references: [users.id] }),
  learningSession: one(learningSessions, {
    fields: [flashcardSessions.learningSessionId],
    references: [learningSessions.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  userWord: one(userWords, { fields: [reviews.userWordId], references: [userWords.id] }),
  flashcardSession: one(flashcardSessions, {
    fields: [reviews.flashcardSessionId],
    references: [flashcardSessions.id],
  }),
  attempts: many(reviewAttempts),
}));

export const reviewAttemptsRelations = relations(reviewAttempts, ({ one }) => ({
  review: one(reviews, { fields: [reviewAttempts.reviewId], references: [reviews.id] }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  user: one(users, { fields: [quizzes.userId], references: [users.id] }),
  aiGeneration: one(aiGenerations, {
    fields: [quizzes.aiGenerationId],
    references: [aiGenerations.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
  userWord: one(userWords, { fields: [quizQuestions.userWordId], references: [userWords.id] }),
  word: one(words, { fields: [quizQuestions.wordId], references: [words.id] }),
  answers: many(quizAnswers),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  user: one(users, { fields: [quizAttempts.userId], references: [users.id] }),
  answers: many(quizAnswers),
}));

export const quizAnswersRelations = relations(quizAnswers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [quizAnswers.quizAttemptId],
    references: [quizAttempts.id],
  }),
  question: one(quizQuestions, {
    fields: [quizAnswers.quizQuestionId],
    references: [quizQuestions.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const aiGenerationsRelations = relations(aiGenerations, ({ one }) => ({
  user: one(users, { fields: [aiGenerations.userId], references: [users.id] }),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, { fields: [studySessions.userId], references: [users.id] }),
}));
