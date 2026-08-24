import { redirect } from "next/navigation";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";

/**
 * Placeholder for Phase 11. The route itself exists now (and is gated both
 * here and in middleware.ts's authorized callback) so Phase 11 doesn't need
 * to renegotiate the /admin path — it just replaces this layout's content.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/dashboard");
    throw error;
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
