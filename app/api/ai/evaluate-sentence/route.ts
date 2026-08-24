import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { getAIService, AIValidationError, AIRateLimitError } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";

/** Stub endpoint for Phase 1 — "write your own sentence" evaluation (spec §10), full UI in a later phase. */
const bodySchema = z.object({
  word: z.string().trim().min(1).max(100),
  sentence: z.string().trim().min(1).max(500),
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
    await assertWithinRateLimit(user.id, "sentence_evaluation");
    const evaluation = await getAIService().evaluateSentence(parsed.data, { userId: user.id });
    return NextResponse.json({ data: evaluation });
  } catch (error) {
    if (error instanceof AIRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof AIValidationError) {
      return NextResponse.json({ error: "Couldn't evaluate that sentence. Try again." }, { status: 502 });
    }
    console.error("sentence evaluation failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
