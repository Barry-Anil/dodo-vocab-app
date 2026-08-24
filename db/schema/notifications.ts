import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";
import { notificationTypeEnum } from "./enums";
import { users } from "./auth";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    readAt: timestamp("read_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt,
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
  ],
);
