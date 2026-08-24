import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingNavbar() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="text-base font-semibold tracking-tight">
        Vocabulary Builder
      </Link>
      <nav className="flex items-center gap-2">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/login">Sign in</Link>}
        />
        <Button nativeButton={false} render={<Link href="/register">Get started</Link>} />
      </nav>
    </header>
  );
}
