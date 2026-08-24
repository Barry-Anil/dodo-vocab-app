import { date, integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { users } from "./auth";

export const userStreaks = pgTable(
  "user_streaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActiveDate: date("last_active_date"),
    // Future-friendly: a subtle "streak freeze" mechanic (not built now).
    freezesAvailable: integer("freezes_available").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("user_streaks_user_id_unique").on(t.userId)],
);
