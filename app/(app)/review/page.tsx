import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getQuickReviewMix } from "@/lib/db/queries/practice";
import { Button } from "@/components/ui/button";
import { FlashcardSession } from "@/components/flashcards/flashcard-session";

export const metadata: Metadata = { title: "Quick Review – Vocabulary Builder" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const mix = await getQuickReviewMix(user.id);

  const combined = [...mix.weak, ...mix.due, ...mix.recent];

  if (combined.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 p-6 py-16 text-center">
        <Sparkles className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">You&apos;re all caught up</h1>
        <p className="text-sm text-muted-foreground">
          Nothing due for review right now. Add a few words and check back later.
        </p>
        <Link href="/vocabulary" className="text-sm font-medium underline">
          Go to your word bank
        </Link>
      </div>
    );
  }

  if (!params.start) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quick review</h1>
          <p className="text-sm text-muted-foreground">A focused 5-minute mix, chosen for you.</p>
        </div>

        <div className="shadow-brutal flex flex-col gap-2 rounded-xl border-2 border-foreground bg-card p-4">
          <p className="text-sm font-medium">Today&apos;s review</p>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {mix.weak.length > 0 ? (
              <li className="flex items-center gap-2">
                <AlertTriangle className="size-3.5 text-rose-500" /> {mix.weak.length} weak word
                {mix.weak.length === 1 ? "" : "s"}
              </li>
            ) : null}
            {mix.due.length > 0 ? (
              <li className="flex items-center gap-2">
                <Clock className="size-3.5 text-amber-500" /> {mix.due.length} due word{mix.due.length === 1 ? "" : "s"}
              </li>
            ) : null}
            {mix.recent.length > 0 ? (
              <li className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-primary" /> {mix.recent.length} recent word
                {mix.recent.length === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>
        </div>

        <Button nativeButton={false} render={<Link href="/review?start=1">Start review</Link>} />
      </div>
    );
  }

  const words = combined.map(({ userWord, word }) => ({
    userWordId: userWord.id,
    text: word.text,
    partOfSpeech: word.partOfSpeech,
    definition: word.definition,
    examples: word.examples,
    synonyms: word.synonyms,
    antonyms: word.antonyms,
  }));

  return (
    <div className="p-6">
      <FlashcardSession words={words} requestedMode="mixed" scopeLabel="Quick review" />
    </div>
  );
}
