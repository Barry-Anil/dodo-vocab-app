import { createHash } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiGenerations } from "@/db/schema";
import type { aiTaskTypeEnum } from "@/db/schema/enums";

export type AiTaskType = (typeof aiTaskTypeEnum.enumValues)[number];

/** Deterministic JSON.stringify — sorts object keys at every nesting level so key order never affects the hash. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** sha256(taskType + ':' + normalizedInput) — the cache/dedup key. */
export function computeInputHash(taskType: AiTaskType, input: unknown): string {
  return createHash("sha256").update(`${taskType}:${stableStringify(input)}`).digest("hex");
}

/**
 * Tasks whose result is permanently reusable once successful — a word's
 * canonical details/image shouldn't change, so any prior success is reused
 * unconditionally (no TTL). Tasks not listed here (reports, recommendations,
 * quizzes) are always regenerated, since they should reflect current state.
 */
const PERMANENTLY_CACHEABLE_TASKS: ReadonlySet<AiTaskType> = new Set([
  "word_details",
  "image_generation",
]);

export async function findCachedGeneration(taskType: AiTaskType, inputHash: string) {
  if (!PERMANENTLY_CACHEABLE_TASKS.has(taskType)) return null;

  const [row] = await db
    .select()
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.taskType, taskType),
        eq(aiGenerations.inputHash, inputHash),
        eq(aiGenerations.status, "success"),
      ),
    )
    .orderBy(desc(aiGenerations.createdAt))
    .limit(1);

  return row ?? null;
}

interface CreatePendingGenerationArgs {
  userId: string | null;
  taskType: AiTaskType;
  provider: string;
  model: string;
  inputHash: string;
  requestPayload: unknown;
}

export async function createPendingGeneration(args: CreatePendingGenerationArgs) {
  const [row] = await db
    .insert(aiGenerations)
    .values({
      userId: args.userId,
      taskType: args.taskType,
      provider: args.provider,
      model: args.model,
      inputHash: args.inputHash,
      requestPayload: args.requestPayload as object,
      status: "pending",
    })
    .returning({ id: aiGenerations.id });

  return row.id;
}

interface MarkSuccessArgs {
  id: string;
  responsePayload: unknown;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  latencyMs: number;
}

export async function markGenerationSuccess(args: MarkSuccessArgs) {
  await db
    .update(aiGenerations)
    .set({
      status: "success",
      responsePayload: args.responsePayload as object,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      latencyMs: args.latencyMs,
    })
    .where(eq(aiGenerations.id, args.id));
}

interface MarkFailedArgs {
  id: string;
  status: "failed" | "invalid_response";
  errorMessage: string;
  latencyMs?: number;
}

export async function markGenerationFailed(args: MarkFailedArgs) {
  await db
    .update(aiGenerations)
    .set({
      status: args.status,
      errorMessage: args.errorMessage,
      latencyMs: args.latencyMs,
    })
    .where(eq(aiGenerations.id, args.id));
}

/** Count of a user's generations for a task type within the given window — used by rate-limit.ts. */
export async function countRecentGenerations(
  userId: string,
  taskType: AiTaskType,
  sinceMs: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceMs);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.taskType, taskType),
        gte(aiGenerations.createdAt, since),
      ),
    );
  return Number(row?.count ?? 0);
}
