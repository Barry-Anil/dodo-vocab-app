import type { CefrLevel } from "@/lib/ai/types";

export const CEFR_LEVELS: Array<{ value: CefrLevel; label: string; description: string }> = [
  { value: "A1", label: "A1", description: "Beginner" },
  { value: "A2", label: "A2", description: "Elementary" },
  { value: "B1", label: "B1", description: "Intermediate" },
  { value: "B2", label: "B2", description: "Upper intermediate" },
  { value: "C1", label: "C1", description: "Advanced" },
  { value: "C2", label: "C2", description: "Proficient" },
];

export const LEARNING_GOALS = [
  { value: "conversation", label: "Conversation" },
  { value: "academic", label: "Academic" },
  { value: "work", label: "Work" },
  { value: "interview", label: "Interview" },
  { value: "ielts", label: "IELTS" },
  { value: "toefl", label: "TOEFL" },
  { value: "general", label: "General improvement" },
] as const;

export const DAILY_TARGETS = [2, 3, 5, 10] as const;
