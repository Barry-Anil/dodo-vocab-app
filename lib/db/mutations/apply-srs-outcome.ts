import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userWords } from "@/db/schema";
import type { Rating, WordStatus } from "@/db/schema";
import { getSpacedRepetitionAlgorithm } from "@/lib/srs/algorithm";

const WEAK_AFTER_CONSECUTIVE_WRONG = 2;
const CLEAR_WEAK_AFTER_CONSECUTIVE_CORRECT = 3;
const MASTERED_MIN_SCORE = 90;
const MASTERED_MIN_REPETITIONS = 3;
const REVIEW_MIN_SCORE = 40;

function nextStatus(masteryScore: number, repetitionNumber: number): WordStatus {
  if (masteryScore >= MASTERED_MIN_SCORE && repetitionNumber >= MASTERED_MIN_REPETITIONS) return "MASTERED";
  if (repetitionNumber >= 1) return masteryScore >= REVIEW_MIN_SCORE ? "REVIEW" : "LEARNING";
  return "LEARNING";
}

export interface SrsOutcome {
  wasCorrect: boolean;
  intervalBeforeDays: number;
  intervalAfterDays: number;
}

/**
 * Shared by both flashcard/quick-review submission (lib/actions/reviews.ts)
 * and quiz answer submission (lib/actions/quiz.ts) — "incorrect answers
 * must influence future review" (spec §46) applies identically regardless
 * of which surface produced the answer, so this is the one place that
 * schedules the next review, updates mastery, and flips the weak flag.
 *
 * The "weak" flag requires *sustained* correct answers to clear (spec
 * §17) — that needs the consecutive-correct counter tracked in user_words,
 * which is why this isn't folded into the (otherwise pure) SRS algorithm.
 */
export async function applySrsOutcome(
  userId: string,
  userWordId: string,
  rating: Rating,
): Promise<SrsOutcome | null> {
  const [current] = await db
    .select()
    .from(userWords)
    .where(eq(userWords.id, userWordId))
    .limit(1);
  if (!current || current.userId !== userId) return null;

  const now = new Date();
  const algorithm = getSpacedRepetitionAlgorithm();
  const scheduled = algorithm.schedule(
    {
      rating,
      currentIntervalDays: current.intervalDays,
      currentEaseFactor: current.easeFactor,
      repetitionNumber: current.repetitionNumber,
      consecutiveWrong: current.consecutiveWrong,
    },
    now,
  );

  const wasCorrect = rating !== "again";
  const consecutiveCorrect = wasCorrect ? current.consecutiveCorrect + 1 : 0;
  const consecutiveWrong = wasCorrect ? 0 : current.consecutiveWrong + 1;

  let isWeak = current.isWeak;
  if (!wasCorrect && consecutiveWrong >= WEAK_AFTER_CONSECUTIVE_WRONG) {
    isWeak = true;
  } else if (wasCorrect && isWeak && consecutiveCorrect >= CLEAR_WEAK_AFTER_CONSECUTIVE_CORRECT) {
    isWeak = false;
  }

  const masteryScore = Math.max(0, Math.min(100, current.masteryScore + scheduled.masteryDelta));
  const status = nextStatus(masteryScore, scheduled.nextRepetitionNumber);
  const justMastered = status === "MASTERED" && current.status !== "MASTERED";

  await db
    .update(userWords)
    .set({
      status,
      timesSeen: current.timesSeen + 1,
      timesCorrect: current.timesCorrect + (wasCorrect ? 1 : 0),
      timesWrong: current.timesWrong + (wasCorrect ? 0 : 1),
      consecutiveCorrect,
      consecutiveWrong,
      lastReviewedAt: now,
      nextReviewAt: scheduled.nextReviewAt,
      intervalDays: scheduled.nextIntervalDays,
      easeFactor: scheduled.nextEaseFactor,
      repetitionNumber: scheduled.nextRepetitionNumber,
      masteryScore,
      isWeak,
      weakSince: isWeak && !current.isWeak ? now : current.weakSince,
      markedMasteredAt: justMastered ? now : current.markedMasteredAt,
    })
    .where(eq(userWords.id, userWordId));

  return {
    wasCorrect,
    intervalBeforeDays: current.intervalDays,
    intervalAfterDays: scheduled.nextIntervalDays,
  };
}
