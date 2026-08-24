import { boolean, integer, pgTable, text, time, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { cefrLevelEnum } from "./enums";
import { users } from "./auth";

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cefrLevel: cefrLevelEnum("cefr_level").notNull().default("B1"),
    // Free-form goal tags, e.g. ['conversation', 'ielts', 'work'] — kept as
    // a text[] rather than an enum so new goals can be added without a
    // migration (spec §26 lists goals as a fixed set today, but product
    // copy/goals are likely to evolve).
    learningGoals: text("learning_goals").array().notNull().default([]),
    dailyWordTarget: integer("daily_word_target").notNull().default(2),
    reminderTime: time("reminder_time"),
    timezone: text("timezone").notNull().default("UTC"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("user_preferences_user_id_unique").on(t.userId)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dailyReminderEnabled: boolean("daily_reminder_enabled").notNull().default(true),
    reviewDueReminderEnabled: boolean("review_due_reminder_enabled").notNull().default(true),
    weeklyQuizReminderEnabled: boolean("weekly_quiz_reminder_enabled").notNull().default(true),
    weeklyReportEnabled: boolean("weekly_report_enabled").notNull().default(true),
    streakRiskReminderEnabled: boolean("streak_risk_reminder_enabled").notNull().default(true),
    // Second daily reminder (e.g. evening nudge if today's goal isn't done)
    secondReminderEnabled: boolean("second_reminder_enabled").notNull().default(false),
    secondReminderTime: time("second_reminder_time"),
    quietHoursStart: time("quiet_hours_start"),
    quietHoursEnd: time("quiet_hours_end"),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("notification_preferences_user_id_unique").on(t.userId)],
);
