"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { todayInTimezone } from "@/lib/date";
import type { ActionResult } from "./auth";

const recordSchema = z.object({
  // Focused seconds actually completed. Cap at 4h so a stuck tab can't log
  // an absurd session; floor at 60s so accidental taps don't create noise.
  durationSeconds: z.number().int().min(60).max(4 * 60 * 60),
  plannedSeconds: z.number().int().min(60).max(4 * 60 * 60),
  endedEarly: z.boolean(),
  // Client clock when the interval started — trusted only for display
  // ordering, never for the calendar-date bucket (that's derived server-side).
  startedAtMs: z.number().int().positive(),
});

/**
 * Records one completed (or manually-ended) Pomodoro focus interval against
 * the learner's local calendar date. Called by the timer when a focus block
 * finishes or the user stops it early.
 */
export async function recordStudySession(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Couldn't record that session." };
  }
  const { durationSeconds, plannedSeconds, endedEarly, startedAtMs } = parsed.data;

  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";

  const startedAt = new Date(startedAtMs);
  const startedAtValid = !Number.isNaN(startedAt.getTime());
  const date = todayInTimezone(timezone);

  await db.insert(studySessions).values({
    userId: user.id,
    date,
    durationSeconds,
    plannedSeconds,
    endedEarly,
    startedAt: startedAtValid ? startedAt : new Date(),
  });

  revalidatePath("/study");
  return { success: true };
}
