"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWordRecommendations } from "@/lib/actions/recommendations";
import { addWords } from "@/lib/actions/words";

interface Recommendation {
  text: string;
  reason: string;
}

export function RecommendedWords() {
  const router = useRouter();
  const [words, setWords] = useState<Recommendation[] | null>(null);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [isLoading, startLoading] = useTransition();
  const [isAdding, startAdding] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    startLoading(async () => {
      const result = await getWordRecommendations();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setWords(result.recommendations.recommendedWords);
    });
  }

  function addOne(text: string) {
    startAdding(async () => {
      const result = await addWords({ text });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const outcome = result.outcomes[0];
      if (outcome?.error) {
        toast.error(outcome.error);
        return;
      }
      setAddedWords((prev) => new Set(prev).add(text));
      toast.success(`Added "${text}" to your vocabulary`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Words for you today
        </CardTitle>
        {!words ? (
          <Button type="button" size="sm" variant="outline" onClick={load} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {isLoading ? "Thinking…" : "Get suggestions"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!words && !error ? (
          <p className="text-sm text-muted-foreground">
            Get a personalized list based on your level, goals, and what you already know.
          </p>
        ) : null}
        {words ? (
          <ul className="flex flex-col gap-2">
            {words.map((rec) => {
              const added = addedWords.has(rec.text);
              return (
                <li
                  key={rec.text}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div>
                    <span className="font-medium capitalize">{rec.text}</span>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={added ? "ghost" : "outline"}
                    disabled={added || isAdding}
                    onClick={() => addOne(rec.text)}
                  >
                    {added ? "Added" : <Plus className="size-3.5" />}
                    {added ? "" : "Add"}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
