import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Vocabulary Builder
      </p>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance">
        Learn two words a day. Never forget them again.
      </h1>
      <p className="max-w-md text-muted-foreground">
        AI-generated vocabulary cards, spaced-repetition review, and weekly quizzes — built to
        help you actually retain what you learn.
      </p>
      <div className="flex gap-3">
        <Button size="lg" nativeButton={false} render={<Link href="/register">Get started</Link>} />
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="/login">Sign in</Link>}
        />
      </div>
    </div>
  );
}
