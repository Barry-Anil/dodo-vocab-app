import Link from "next/link";
import { Sparkles, RotateCcw, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { WordShowcase } from "@/components/landing/word-showcase";
import { LEARNING_GOALS } from "@/lib/constants/preferences";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-generated word cards",
    description: "Definitions, natural examples, synonyms, and usage notes — generated once, cached forever.",
  },
  {
    icon: RotateCcw,
    title: "Spaced repetition",
    description: "A scheduler that actually adapts — words you struggle with come back until they stick.",
  },
  {
    icon: ClipboardCheck,
    title: "Weekly AI quizzes",
    description: "Varied question types built from what you learned, with weak words carried over.",
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Soft decorative background glow — pure CSS, no assets. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] overflow-hidden"
      >
        <div className="absolute top-[-120px] left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-[80px] left-1/2 h-[300px] w-[500px] -translate-x-[80%] rounded-full bg-[color-mix(in_oklch,var(--chart-5),transparent_60%)] blur-3xl" />
      </div>

      <LandingNavbar />

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-12 px-6 py-12 lg:flex-row lg:items-center lg:gap-8 lg:py-20">
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Vocabulary Builder
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
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

            <div className="flex flex-col items-center gap-2 pt-4 lg:items-start">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Built for how you&apos;re actually learning
              </p>
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                {LEARNING_GOALS.map((goal) => (
                  <span
                    key={goal.value}
                    className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {goal.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <WordShowcase />
        </section>

        <section className="border-t bg-card/50">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-14 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden="true" />
                </div>
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
