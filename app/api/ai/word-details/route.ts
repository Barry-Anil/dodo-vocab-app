import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { getAIService, AIValidationError, AIRateLimitError, cefrLevelSchema } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";

/**
 * Stub endpoint for Phase 1 — exercises the full AIService/cache/rate-limit
 * path end-to-end, but isn't wired into any UI yet (that's Phase 4, where
 * "add a word" persists the result into words/user_words).
 */
const bodySchema = z.object({
  word: z.string().trim().min(1).max(100),
  userLevel: cefrLevelSchema.optional(),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(user.id, "word_details");
    const details = await getAIService().generateWordDetails(parsed.data, { userId: user.id });
    return NextResponse.json({ data: details });
  } catch (error) {
    if (error instanceof AIRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof AIValidationError) {
      return NextResponse.json(
        { error: "Couldn't generate the word details. Try again." },
        { status: 502 },
      );
    }
    console.error("word-details generation failed", error);
    return NextResponse.json(
      { error: "Something went wrong generating this word. Try again." },
      { status: 500 },
    );
  }
}
