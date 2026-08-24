import { countRecentGenerations, type AiTaskType } from "./cache";
import { AIRateLimitError } from "./types";

/**
 * DB-backed fixed-window limiter, reusing the ai_generations table that
 * already exists for logging — no new infrastructure. This is
 * abuse-prevention, not billing-critical metering, so the small race window
 * under concurrent requests from the same user is an accepted trade-off.
 *
 * A distributed limiter (Upstash Redis) is the documented Phase 12 upgrade
 * path if this proves too coarse under real load — see .env.example for the
 * pre-declared (currently unused) env vars.
 */
const HOUR_MS = 60 * 60 * 1000;

const HOURLY_LIMITS: Record<AiTaskType, number> = {
  word_details: 60,
  image_generation: 30,
  quiz_generation: 5,
  question_generation: 20,
  weekly_report: 3,
  recommendations: 10,
  sentence_evaluation: 60,
  text_extraction: 15,
};

export async function assertWithinRateLimit(userId: string, taskType: AiTaskType): Promise<void> {
  const limit = HOURLY_LIMITS[taskType];
  const recentCount = await countRecentGenerations(userId, taskType, HOUR_MS);

  if (recentCount >= limit) {
    throw new AIRateLimitError(
      `You've reached the hourly limit for this action (${limit}/hour). Please try again later.`,
    );
  }
}
