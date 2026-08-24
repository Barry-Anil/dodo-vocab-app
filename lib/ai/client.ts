import { env } from "@/lib/env";
import { AnthropicAIService } from "./providers/anthropic";
import { GroqAIService } from "./providers/groq";
import type { AIService } from "./types";

/**
 * lib/ai/ is the only place that imports a provider SDK directly. Everywhere
 * else in the app calls getAIService() and depends only on the AIService
 * interface. Which concrete provider is active is controlled entirely by
 * AI_PROVIDER (lib/env.ts) — Groq by default, Anthropic as a swap-in
 * alternative — with no call site changes needed either way.
 */
let instance: AIService | null = null;

export function getAIService(): AIService {
  if (!instance) {
    instance = env.AI_PROVIDER === "anthropic" ? new AnthropicAIService() : new GroqAIService();
  }
  return instance;
}

export * from "./types";
