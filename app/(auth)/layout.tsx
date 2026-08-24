import Link from "next/link";
import { PageTransition } from "@/components/shared/page-transition";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-lg font-semibold tracking-tight">
          Vocabulary Builder
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
