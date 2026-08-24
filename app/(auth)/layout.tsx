import Link from "next/link";
import { PageTransition } from "@/components/shared/page-transition";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-lg font-bold tracking-tight">
          Vocabulary Builder
        </Link>
        <div className="shadow-brutal-lg rounded-xl border-2 border-foreground bg-card p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
