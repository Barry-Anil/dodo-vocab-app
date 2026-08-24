import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { userRoleEnum } from "./enums";

/**
 * NextAuth v5 is configured with the Credentials provider + JWT session
 * strategy (see auth.ts) — no database adapter is wired up, so the standard
 * Auth.js `accounts`/`sessions`/`verification_token` tables are intentionally
 * NOT created. Credentials auth isn't compatible with adapter-managed
 * database sessions anyway. If a future phase adds an OAuth provider,
 * @auth/drizzle-adapter and those tables would need to be introduced then.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    // lower(trim(email)) — the actual uniqueness key, so login/registration
    // is case-insensitive while `email` retains the user's original casing.
    emailNormalized: text("email_normalized").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    role: userRoleEnum("role").notNull().default("user"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_email_normalized_unique").on(t.emailNormalized)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Only the hash is stored — the raw token is only ever shown once, in
    // the reset link itself, and never persisted.
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [
    uniqueIndex("password_reset_tokens_token_hash_unique").on(t.tokenHash),
    index("password_reset_tokens_user_id_idx").on(t.userId),
  ],
);
