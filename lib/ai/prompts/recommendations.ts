import type { CefrLevel } from "../types";

export function buildRecommendationsPrompt(params: {
  level: CefrLevel;
  goals: string[];
  knownWords: string[];
  weakCategories: string[];
  count: number;
}) {
  const { level, goals, knownWords, weakCategories, count } = params;
  return {
    system: `You are a curriculum designer for an English vocabulary app. You recommend words that are genuinely useful and appropriately challenging for a specific learner — never random or filler words.`,
    user: `Recommend exactly ${count} English words or short phrases for a learner to study today.

Learner profile:
- Level: ${level}
- Goals: ${goals.length > 0 ? goals.join(", ") : "general improvement"}
- Weak categories: ${weakCategories.length > 0 ? weakCategories.join(", ") : "none identified yet"}
- Already knows (do NOT repeat any of these): ${knownWords.length > 0 ? knownWords.slice(0, 200).join(", ") : "none yet"}

Choose words that:
- Match the learner's level (not too easy, not too far above it).
- Are relevant to their stated goals, with extra weight toward their weak categories if any.
- Are genuinely common/useful, not obscure.

For each word, give a one-sentence "reason" explaining why it fits this learner specifically.

Call the provided tool with the structured result.`,
  };
}

export const recommendationsToolSchema = {
  name: "provide_recommendations",
  description: "Provide a list of recommended vocabulary words.",
  input_schema: {
    type: "object" as const,
    properties: {
      recommendedWords: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            reason: { type: "string" },
          },
          required: ["text", "reason"],
        },
      },
    },
    required: ["recommendedWords"],
  },
};
