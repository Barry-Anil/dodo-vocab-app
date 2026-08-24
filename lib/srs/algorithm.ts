export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewInput {
  rating: ReviewRating;
  currentIntervalDays: number;
  currentEaseFactor: number;
  repetitionNumber: number;
  /** Consecutive wrong answers *before* this review, used for the isWeak threshold. */
  consecutiveWrong: number;
}

export interface ReviewOutput {
  nextIntervalDays: number;
  nextEaseFactor: number;
  nextRepetitionNumber: number;
  nextReviewAt: Date;
  /** Applied to user_words.masteryScore (0-100 scale), can be negative. */
  masteryDelta: number;
  /** Whether this outcome should flip/keep the word's isWeak flag on. */
  isWeak: boolean;
}

/**
 * Generic scheduling contract: rating + prior state -> next state. Keeping
 * this interface algorithm-agnostic (no SM-2-specific vocabulary in the
 * signature) means a future `FsrsAlgorithm implements SpacedRepetitionAlgorithm`
 * can be dropped in without touching any calling code.
 */
export interface SpacedRepetitionAlgorithm {
  schedule(input: ReviewInput, now: Date): ReviewOutput;
}

const MIN_EASE_FACTOR = 1.3;
const WEAK_AFTER_CONSECUTIVE_WRONG = 2;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + days * 24 * 60 * 60 * 1000);
  return result;
}

/**
 * SM-2-like implementation — the Phase 1 default. `intervalDays` and
 * `easeFactor` map directly onto the standard SM-2 mechanics; `masteryScore`
 * is a separate derived composite (not the raw interval) so status
 * transitions (NEW -> LEARNING -> REVIEW -> MASTERED) can be tuned from
 * accuracy + elapsed time without changing the scheduling math itself.
 */
export class Sm2Algorithm implements SpacedRepetitionAlgorithm {
  schedule(input: ReviewInput, now: Date): ReviewOutput {
    const { rating, currentIntervalDays, currentEaseFactor, repetitionNumber, consecutiveWrong } = input;

    switch (rating) {
      case "again": {
        const nextConsecutiveWrong = consecutiveWrong + 1;
        const nextEaseFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2);
        const nextIntervalDays = 1 / 24; // retry within the hour, same day
        return {
          nextIntervalDays,
          nextEaseFactor,
          nextRepetitionNumber: 0,
          nextReviewAt: addDays(now, nextIntervalDays),
          masteryDelta: -8,
          isWeak: nextConsecutiveWrong >= WEAK_AFTER_CONSECUTIVE_WRONG,
        };
      }

      case "hard": {
        const nextEaseFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15);
        const nextIntervalDays = Math.max(1, currentIntervalDays * 1.2);
        return {
          nextIntervalDays,
          nextEaseFactor,
          nextRepetitionNumber: repetitionNumber + 1,
          nextReviewAt: addDays(now, nextIntervalDays),
          masteryDelta: 2,
          isWeak: false,
        };
      }

      case "good": {
        const nextRepetitionNumber = repetitionNumber + 1;
        let nextIntervalDays: number;
        if (nextRepetitionNumber === 1) nextIntervalDays = 1;
        else if (nextRepetitionNumber === 2) nextIntervalDays = 6;
        else nextIntervalDays = Math.round(currentIntervalDays * currentEaseFactor);
        return {
          nextIntervalDays,
          nextEaseFactor: currentEaseFactor,
          nextRepetitionNumber,
          nextReviewAt: addDays(now, nextIntervalDays),
          masteryDelta: 6,
          isWeak: false,
        };
      }

      case "easy": {
        const nextRepetitionNumber = repetitionNumber + 1;
        const nextEaseFactor = currentEaseFactor + 0.15;
        const base = nextRepetitionNumber <= 1 ? 3 : currentIntervalDays * currentEaseFactor;
        const nextIntervalDays = Math.round(base * 1.3);
        return {
          nextIntervalDays,
          nextEaseFactor,
          nextRepetitionNumber,
          nextReviewAt: addDays(now, nextIntervalDays),
          masteryDelta: 10,
          isWeak: false,
        };
      }
    }
  }
}

let algorithmInstance: SpacedRepetitionAlgorithm | null = null;

/** Swap the returned implementation here to change the scheduling algorithm app-wide. */
export function getSpacedRepetitionAlgorithm(): SpacedRepetitionAlgorithm {
  if (!algorithmInstance) algorithmInstance = new Sm2Algorithm();
  return algorithmInstance;
}
