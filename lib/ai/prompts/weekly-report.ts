import type { WeeklyStatsSnapshot } from "../types";

export function buildWeeklyReportPrompt(weekStartDate: string, stats: WeeklyStatsSnapshot) {
  return {
    system: `You are a supportive, insightful English vocabulary coach. You write honest, specific, encouraging feedback — never generic praise, never harsh. You point out real patterns and give one or two concrete, actionable strategies, not a long list.`,
    user: `Write a weekly learning report for the week starting ${weekStartDate}, based on this data:

- Words learned: ${stats.wordsLearned}
- Words mastered: ${stats.wordsMastered}
- Reviews completed: ${stats.reviewsCompleted}
- Review accuracy: ${stats.reviewAccuracy !== null ? `${Math.round(stats.reviewAccuracy * 100)}%` : "no review data yet"}
- Quiz average score: ${stats.quizAverageScore !== null ? `${Math.round(stats.quizAverageScore)}%` : "no quiz taken yet"}
- Current streak: ${stats.currentStreak} days
- Strongest category: ${stats.strongestCategory ?? "not enough data yet"}
- Weakest category: ${stats.weakestCategory ?? "not enough data yet"}

Write:
- A short 2-3 sentence summary of the week.
- A list of specific strengths (based on the actual numbers above, not generic).
- A list of specific weak areas.
- 1-3 concrete strategy suggestions for next week.

Call the provided tool with the structured result.`,
  };
}

export const weeklyReportToolSchema = {
  name: "provide_weekly_report",
  description: "Provide a structured weekly learning report.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      weakAreas: { type: "array", items: { type: "string" } },
      strategySuggestions: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "strengths", "weakAreas", "strategySuggestions"],
  },
};
