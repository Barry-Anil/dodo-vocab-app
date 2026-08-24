import { index, integer, jsonb, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";
import { aiStatusEnum, aiTaskTypeEnum } from "./enums";
import { users } from "./auth";

/**
 * Every AI provider call is logged here — this single table is what drives
 * three things at once:
 *  1. Caching/dedup: `inputHash` is checked before calling the provider so
 *     word details/images are generated once and reused forever.
 *  2. Cost + failure visibility for the Phase 11 admin dashboard.
 *  3. The Phase 1 DB-backed AI rate limiter (count recent rows per user).
 */
export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable: background/system-initiated generations (e.g. pre-warming a
    // word from a paste-text extraction) aren't always tied to one user.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    taskType: aiTaskTypeEnum("task_type").notNull(),
    provider: text("provider").notNull().default("anthropic"),
    model: text("model").notNull(),
    // sha256(taskType + ':' + normalizedInput) — the cache/dedup key.
    inputHash: text("input_hash").notNull(),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    status: aiStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    estimatedCostUsd: real("estimated_cost_usd"),
    latencyMs: integer("latency_ms"),
    createdAt,
  },
  (t) => [
    index("ai_generations_input_hash_idx").on(t.inputHash),
    index("ai_generations_task_type_idx").on(t.taskType),
    index("ai_generations_user_id_idx").on(t.userId),
    index("ai_generations_status_idx").on(t.status),
    index("ai_generations_created_at_idx").on(t.createdAt),
    // Powers the rate limiter's "recent generations for this user" query.
    index("ai_generations_user_created_idx").on(t.userId, t.createdAt),
  ],
);
