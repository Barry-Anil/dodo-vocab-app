import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password – Vocabulary Builder" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold">Invalid link</h1>
        <p className="text-sm text-muted-foreground">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Must be at least 8 characters.</p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
