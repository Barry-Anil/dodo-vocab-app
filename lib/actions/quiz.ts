"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { quizzes, quizQuestions, quizAnswers, quizAttempts } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getAIService, AIRateLimitError, AIValidationError } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { getQuizForWeek, getQuizCandidateWords, createQuizAttempt } from "@/lib/db/queries/quizzes";
import { applySrsOutcome } from "@/lib/db/mutations/apply-srs-outcome";
import { markQuizCompletedToday } from "@/lib/db/queries/daily";
import { todayInTimezone, weekStartFor } from "@/lib/date";
import type { WordDetails } from "@/lib/ai/types";

export type GenerateQuizResult = { success: true; quizId: string } | { success: false; error: string };

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 12;

/** Idempotent per week — re-navigating to /quiz doesn't regenerate an existing week's quiz. */
export async function generateWeeklyQuiz(): Promise<GenerateQuizResult> {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";
  const weekStartDate = weekStartFor(todayInTimezone(timezone));

  const existing = await getQuizForWeek(user.id, weekStartDate);
  if (existing && existing.status !== "expired") {
    return { success: true, quizId: existing.id };
  }

  const candidates = await getQuizCandidateWords(user.id, weekStartDate);
  if (candidates.all.length === 0) {
    return {
      success: false,
      error: "Add some vocabulary this week to generate a quiz — nothing to test yet.",
    };
  }

  const questionCount = Math.min(Math.max(candidates.all.length, MIN_QUESTIONS), MAX_QUESTIONS);

  const targetWords = candidates.all.map(({ userWord, word }) => ({
    userWordId: userWord.id,
    word: {
      text: word.text,
      partOfSpeech: word.partOfSpeech ?? "other",
      pronunciation: word.pronunciation ?? "",
      ipa: word.ipa ?? "",
      cefrLevel: word.cefrLevel ?? "B1",
      definition: word.definition ?? "",
      simpleExplanation: word.simpleExplanation ?? "",
      practicalExplanation: word.practicalExplanation ?? "",
      examples: word.examples.length > 0 ? word.examples : [word.definition ?? word.text],
      synonyms: word.synonyms,
      antonyms: word.antonyms,
      collocations: word.collocations,
      wordFamily: word.wordFamily,
      usageNotes: word.usageNotes ?? "",
      commonMistakes: word.commonMistakes ?? "",
    } satisfies WordDetails & { text: string },
  }));

  try {
    await assertWithinRateLimit(user.id, "quiz_generation");
    const generated = await getAIService().generateQuiz(
      { userId: user.id, targetWords, questionCount },
      { userId: user.id },
    );

    const wordLookup = new Map(candidates.all.map(({ userWord, word }) => [word.text.toLowerCase(), { userWord, word }]));

    const [quiz] = await db
      .insert(quizzes)
      .values({
        userId: user.id,
        type: "weekly",
        title: `Week of ${weekStartDate}`,
        weekStartDate,
        status: "in_progress",
        totalQuestions: generated.questions.length,
        startedAt: new Date(),
      })
      .returning();

    await db.insert(quizQuestions).values(
      generated.questions.map((q, index) => {
        const match = wordLookup.get(q.wordText.toLowerCase());
        return {
          quizId: quiz.id,
          userWordId: match?.userWord.id ?? null,
          wordId: match?.word.id ?? null,
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer,
          orderIndex: index,
          difficultyAtCreation: match?.userWord.difficulty ?? null,
        };
      }),
    );

    return { success: true, quizId: quiz.id };
  } catch (error) {
    if (error instanceof AIRateLimitError) return { success: false, error: error.message };
    if (error instanceof AIValidationError) {
      return { success: false, error: "Couldn't generate this week's quiz. Try again." };
    }
    throw error;
  }
}

export type SubmitQuizResult =
  | { success: true; score: number; correctCount: number; total: number }
  | { success: false; error: string };

export async function submitQuiz(quizId: string, answers: Record<string, string>): Promise<SubmitQuizResult> {
  const user = await requireUser();

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz || quiz.userId !== user.id) return { success: false, error: "Quiz not found." };

  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  if (questions.length === 0) return { success: false, error: "This quiz has no questions." };

  const attempt = await createQuizAttempt(quizId, user.id);

  let correctCount = 0;
  for (const question of questions) {
    const userAnswer = (answers[question.id] ?? "").trim();
    const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.trim().toLowerCase();
    if (isCorrect) correctCount++;

    await db.insert(quizAnswers).values({
      quizAttemptId: attempt.id,
      quizQuestionId: question.id,
      userAnswer,
      isCorrect,
    });

    if (question.userWordId) {
      await applySrsOutcome(user.id, question.userWordId, isCorrect ? "good" : "again");
    }
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const now = new Date();

  await db.update(quizAttempts).set({ completedAt: now, score }).where(eq(quizAttempts.id, attempt.id));
  await db.update(quizzes).set({ status: "completed", score, completedAt: now }).where(eq(quizzes.id, quizId));

  const preferences = await getUserPreferences(user.id);
  await markQuizCompletedToday(user.id, preferences?.timezone ?? "UTC", preferences?.dailyWordTarget ?? 2);

  revalidatePath("/quiz");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { success: true, score, correctCount, total: questions.length };
}
