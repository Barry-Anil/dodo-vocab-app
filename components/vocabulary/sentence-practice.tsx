"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { evaluateOwnSentence, type EvaluateSentenceResult } from "@/lib/actions/practice";

export function SentencePractice({ word }: { word: string }) {
  const [sentence, setSentence] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<EvaluateSentenceResult | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const outcome = await evaluateOwnSentence(word, sentence);
      setResult(outcome);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        placeholder={`Write a sentence using "${word}"…`}
        rows={3}
      />
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={isPending || !sentence.trim()}>
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Checking…
            </>
          ) : (
            "Check my sentence"
          )}
        </Button>
      </div>

      {result && !result.success ? <p className="text-sm text-destructive">{result.error}</p> : null}

      {result?.success ? (
        <div
          className={`flex gap-2 rounded-lg border p-3 text-sm ${
            result.evaluation.isCorrectUsage
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          {result.evaluation.isCorrectUsage ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="flex flex-col gap-1">
            <p>{result.evaluation.feedback}</p>
            {result.evaluation.correctedSentence ? (
              <p className="text-muted-foreground">
                Try: <span className="italic">&ldquo;{result.evaluation.correctedSentence}&rdquo;</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
