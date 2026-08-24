"use server";

import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, userPreferences, notificationPreferences, userStreaks, passwordResetTokens } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  registerSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function logoutUser(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/**
 * Creates the account plus its default rows (preferences, notification
 * preferences, streak) so every downstream phase can assume they exist
 * rather than null-checking everywhere, then signs the user in.
 */
export async function registerUser(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password } = parsed.data;
  const emailNormalized = normalizeEmail(email);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ name, email, emailNormalized, passwordHash })
    .returning({ id: users.id });

  await Promise.all([
    db.insert(userPreferences).values({ userId: user.id }),
    db.insert(notificationPreferences).values({ userId: user.id }),
    db.insert(userStreaks).values({ userId: user.id }),
  ]);

  await signIn("credentials", { email, password, redirect: false });

  return { success: true };
}

export async function loginUser(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Incorrect email or password." };
    }
    throw error;
  }
}

/**
 * Always returns success regardless of whether the email exists, to avoid
 * leaking which emails are registered. Actual email delivery is out of
 * scope for Phase 1 — the reset link is logged to the server console.
 */
export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const emailNormalized = normalizeEmail(parsed.data.email);
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

    // TODO(Phase 2+): send via a real email provider. Logged for local dev.
    console.info(`[password reset] /reset-password?token=${rawToken}`);
  }

  return { success: true };
}

/**
 * Consumes a password-reset token from the /reset-password?token=... link.
 * Tokens are single-use (`usedAt`) and short-lived (`expiresAt`) — both
 * checked here, not just at issuance.
 */
export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");

  const [tokenRow] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!tokenRow) {
    return { success: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.update(users).set({ passwordHash }).where(eq(users.id, tokenRow.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenRow.id));

  return { success: true };
}
