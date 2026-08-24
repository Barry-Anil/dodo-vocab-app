"use server";

import { requireUser } from "@/lib/auth/session";
import { getAIService, AIRateLimitError, AIValidationError } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";
import type { SentenceEvaluation } from "@/lib/ai/types";

export type EvaluateSentenceResult =
  | { success: true; evaluation: SentenceEvaluation }
  | { success: false; error: string };

/** Spec §10: "Write your own sentence" — AI evaluates whether the word was used naturally. */
export async function evaluateOwnSentence(word: string, sentence: string): Promise<EvaluateSentenceResult> {
  const user = await requireUser();

  const trimmed = sentence.trim();
  if (!trimmed) return { success: false, error: "Write a sentence first." };
  if (trimmed.length > 500) return { success: false, error: "Keep it under 500 characters." };

  try {
    await assertWithinRateLimit(user.id, "sentence_evaluation");
    const evaluation = await getAIService().evaluateSentence({ word, sentence: trimmed }, { userId: user.id });
    return { success: true, evaluation };
  } catch (error) {
    if (error instanceof AIRateLimitError) return { success: false, error: error.message };
    if (error instanceof AIValidationError) {
      return { success: false, error: "Couldn't evaluate that sentence. Try again." };
    }
    throw error;
  }
}
