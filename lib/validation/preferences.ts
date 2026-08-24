import { z } from "zod";
import { cefrLevelSchema } from "@/lib/ai/types";
import { DAILY_TARGETS } from "@/lib/constants/preferences";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM format")
  .optional()
  .or(z.literal(""));

export const learningPreferencesSchema = z.object({
  cefrLevel: cefrLevelSchema,
  learningGoals: z.array(z.string()).max(10),
  dailyWordTarget: z
    .number()
    .int()
    .refine((n): n is (typeof DAILY_TARGETS)[number] => (DAILY_TARGETS as readonly number[]).includes(n), {
      message: "Choose one of the offered daily targets.",
    }),
  reminderTime: timeString,
  timezone: z.string().min(1).max(100),
});
export type LearningPreferencesInput = z.infer<typeof learningPreferencesSchema>;

export const notificationPreferencesSchema = z.object({
  dailyReminderEnabled: z.boolean(),
  reviewDueReminderEnabled: z.boolean(),
  weeklyQuizReminderEnabled: z.boolean(),
  weeklyReportEnabled: z.boolean(),
  streakRiskReminderEnabled: z.boolean(),
  secondReminderEnabled: z.boolean(),
  secondReminderTime: timeString,
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});
export type ProfileInput = z.infer<typeof profileSchema>;
