import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { needsOnboarding } from "@/lib/db/queries/preferences";

/**
 * Deliberately outside the (app) route group — onboarding shouldn't show
 * the full sidebar/nav shell (there's nothing to navigate to yet), but it
 * still requires a signed-in user.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Already onboarded — don't let them re-run the flow via a stale link.
  if (!(await needsOnboarding(user.id))) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight">Vocabulary Builder</p>
        <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
