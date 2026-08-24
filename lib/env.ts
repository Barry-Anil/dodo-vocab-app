import { z } from "zod";

/**
 * Validated, typed access to process.env.
 *
 * Import `env` from this module instead of reading `process.env` directly —
 * this fails fast at startup with a clear error if a required variable is
 * missing, instead of surfacing as a confusing runtime error deep in a
 * server action or AI call.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required (openssl rand -base64 32)"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),

  // Which AIService provider is active — lib/ai/client.ts's getAIService()
  // picks the implementation based on this. Groq is the default (fast,
  // cheap, generous free tier); Anthropic remains available as a swap.
  AI_PROVIDER: z.enum(["groq", "anthropic"]).default("groq"),

  GROQ_API_KEY: z.string().optional(),
  GROQ_DEFAULT_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
  GROQ_FAST_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_DEFAULT_MODEL: z.string().min(1).default("claude-sonnet-4-5"),
  ANTHROPIC_FAST_MODEL: z.string().min(1).default("claude-haiku-4-5"),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables. Check your .env.local against .env.example:\n${issues}`,
    );
  }

  // The active provider's API key is required, even though both keys are
  // individually optional above (so you don't need an Anthropic key just to
  // run Groq, or vice versa).
  const { data } = parsed;
  if (data.AI_PROVIDER === "groq" && !data.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required when AI_PROVIDER=groq.");
  }
  if (data.AI_PROVIDER === "anthropic" && !data.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic.");
  }

  return data;
}

export const env = loadEnv();
