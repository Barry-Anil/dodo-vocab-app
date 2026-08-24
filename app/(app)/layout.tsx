import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { needsOnboarding } from "@/lib/db/queries/preferences";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";
import { Topbar } from "@/components/app-shell/topbar";
import { PageTransition } from "@/components/shared/page-transition";

/**
 * Auth-gated shell for every authenticated page. proxy.ts is the first
 * gate; this is the second layer of defense-in-depth (and the source of the
 * user info the shell/topbar render), plus the onboarding gate — a signed-in
 * user who hasn't completed onboarding is routed there before seeing any of
 * the app's real pages.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await needsOnboarding(user.id)) redirect("/onboarding");

  return (
    <div className="flex min-h-svh flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name ?? null} email={user.email ?? ""} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
