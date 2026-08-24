import { and, eq, gte, desc } from "drizzle-orm";
import { db } from "@/db";
import { quizzes, quizQuestions, quizAttempts, quizAnswers, userWords, words, dailyWordEntries, dailyEntries } from "@/db/schema";

export async function getQuizForWeek(userId: string, weekStartDate: string) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.userId, userId), eq(quizzes.weekStartDate, weekStartDate), eq(quizzes.type, "weekly")))
    .limit(1);
  return quiz ?? null;
}

export async function getQuizWithQuestions(userId: string, quizId: string) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .limit(1);
  if (!quiz) return null;

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.orderIndex);

  return { quiz, questions };
}

export async function getLatestCompletedQuiz(userId: string) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.userId, userId), eq(quizzes.status, "completed")))
    .orderBy(desc(quizzes.completedAt))
    .limit(1);
  return quiz ?? null;
}

export async function getQuizHistory(userId: string, limit = 10) {
  return db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.userId, userId), eq(quizzes.status, "completed")))
    .orderBy(desc(quizzes.completedAt))
    .limit(limit);
}

/**
 * Candidate words for this week's quiz: words added since weekStartDate,
 * plus every currently-weak word (spec §17's carry-over) not already
 * included. Deduped by userWordId.
 */
export async function getQuizCandidateWords(userId: string, weekStartDate: string) {
  const addedThisWeek = await db
    .select({ userWord: userWords, word: words })
    .from(dailyWordEntries)
    .innerJoin(dailyEntries, eq(dailyWordEntries.dailyEntryId, dailyEntries.id))
    .innerJoin(userWords, eq(dailyWordEntries.userWordId, userWords.id))
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, weekStartDate)));

  const seen = new Set(addedThisWeek.map((r) => r.userWord.id));

  const weak = await db
    .select({ userWord: userWords, word: words })
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(eq(userWords.userId, userId), eq(userWords.isWeak, true)));

  const carriedOver = weak.filter((r) => !seen.has(r.userWord.id));

  return { addedThisWeek, carriedOver, all: [...addedThisWeek, ...carriedOver] };
}

export async function getLatestAttemptWithAnswers(quizId: string) {
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.quizId, quizId))
    .orderBy(desc(quizAttempts.attemptNumber))
    .limit(1);
  if (!attempt) return null;

  const answers = await db.select().from(quizAnswers).where(eq(quizAnswers.quizAttemptId, attempt.id));
  return { attempt, answers };
}

export async function createQuizAttempt(quizId: string, userId: string) {
  const [existingCount] = await db
    .select({ n: quizAttempts.attemptNumber })
    .from(quizAttempts)
    .where(eq(quizAttempts.quizId, quizId))
    .orderBy(desc(quizAttempts.attemptNumber))
    .limit(1);

  const [attempt] = await db
    .insert(quizAttempts)
    .values({ quizId, userId, attemptNumber: (existingCount?.n ?? 0) + 1 })
    .returning();
  return attempt;
}
