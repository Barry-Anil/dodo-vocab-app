import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { getAIService, AIValidationError, AIRateLimitError, cefrLevelSchema } from "@/lib/ai/client";
import { assertWithinRateLimit } from "@/lib/ai/rate-limit";

/** Stub endpoint for Phase 1 — paste-text vocabulary extraction (spec §20), full UI in a later phase. */
const bodySchema = z.object({
  text: z.string().trim().min(1).max(8000),
  userLevel: cefrLevelSchema.optional(),
  maxWords: z.number().int().min(1).max(30).optional(),
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
    await assertWithinRateLimit(user.id, "text_extraction");
    const extracted = await getAIService().extractVocabularyFromText(parsed.data, { userId: user.id });
    return NextResponse.json({ data: extracted });
  } catch (error) {
    if (error instanceof AIRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof AIValidationError) {
      return NextResponse.json(
        { error: "Couldn't analyze this text. Try again." },
        { status: 502 },
      );
    }
    console.error("text extraction failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
