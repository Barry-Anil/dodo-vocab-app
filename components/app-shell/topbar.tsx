import Link from "next/link";
import { UserMenu } from "./user-menu";

export function Topbar({ name, email }: { name: string | null; email: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
      <Link href="/dashboard" className="text-sm font-semibold tracking-tight md:hidden">
        Vocabulary Builder
      </Link>
      <div className="hidden md:block" />
      <UserMenu name={name} email={email} />
    </header>
  );
}
