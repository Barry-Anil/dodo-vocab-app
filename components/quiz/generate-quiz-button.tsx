"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateWeeklyQuiz } from "@/lib/actions/quiz";

export function GenerateQuizButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateWeeklyQuiz();
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/quiz/${result.quizId}`);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={generate} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {isPending ? "Building your quiz…" : "Generate this week's quiz"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
