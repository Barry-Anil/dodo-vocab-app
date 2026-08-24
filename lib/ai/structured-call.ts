import type { z } from "zod";
import {
  computeInputHash,
  createPendingGeneration,
  findCachedGeneration,
  markGenerationFailed,
  markGenerationSuccess,
  type AiTaskType,
} from "./cache";
import { AIValidationError } from "./types";

export interface StructuredCallResult {
  /** The provider's raw tool-call arguments, parsed from JSON — validated by the caller against `schema`. */
  raw: unknown;
  promptTokens?: number;
  completionTokens?: number;
}

interface RunStructuredCallParams<T> {
  taskType: AiTaskType;
  input: unknown;
  provider: string;
  model: string;
  userId?: string;
  schema: z.ZodType<T>;
  requestPayload: unknown;
  /** Makes the actual provider API call and extracts the tool-call arguments — the only provider-specific part. */
  execute: () => Promise<StructuredCallResult>;
}

/**
 * The cache-check → call → validate → log flow shared by every AIService
 * provider (lib/ai/providers/*.ts). Providers differ in their SDK and
 * tool-calling wire format (Anthropic's `tool_use` blocks vs. the
 * OpenAI-compatible `tool_calls` Groq uses) — everything else (dedup via
 * ai_generations, Zod validation before anything reaches domain tables,
 * cost/latency logging) is identical, so it lives here once.
 */
export async function runStructuredCall<T>(params: RunStructuredCallParams<T>): Promise<T> {
  const { taskType, input, provider, model, userId, schema, requestPayload, execute } = params;

  const inputHash = computeInputHash(taskType, input);
  const cached = await findCachedGeneration(taskType, inputHash);
  if (cached?.responsePayload) {
    const parsed = schema.safeParse(cached.responsePayload);
    if (parsed.success) return parsed.data;
    // Cached payload no longer validates (e.g. schema changed since it was stored) — regenerate.
  }

  const generationId = await createPendingGeneration({
    userId: userId ?? null,
    taskType,
    provider,
    model,
    inputHash,
    requestPayload,
  });

  const startedAt = Date.now();
  try {
    const { raw, promptTokens, completionTokens } = await execute();
    const latencyMs = Date.now() - startedAt;

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      await markGenerationFailed({
        id: generationId,
        status: "invalid_response",
        errorMessage: parsed.error.message,
        latencyMs,
      });
      throw new AIValidationError(
        `AI response failed validation for task "${taskType}": ${parsed.error.message}`,
        raw,
      );
    }

    await markGenerationSuccess({
      id: generationId,
      responsePayload: parsed.data,
      promptTokens,
      completionTokens,
      latencyMs,
    });

    return parsed.data;
  } catch (error) {
    if (error instanceof AIValidationError) throw error;

    await markGenerationFailed({
      id: generationId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }
}
