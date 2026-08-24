"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { submitReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";
import type { Rating } from "@/db/schema";

export interface PracticeWord {
  userWordId: string;
  text: string;
  partOfSpeech: string | null;
  definition: string | null;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

type FlipMode = "flashcard_word_to_meaning" | "flashcard_meaning_to_word";
type ChallengeMode = "flashcard_fill_blank" | "flashcard_synonym_challenge" | "flashcard_antonym_challenge";
export type FlashcardMode = FlipMode | ChallengeMode;

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** For a given card, resolves "mixed" mode into a concrete one it can actually support. */
function resolveMode(word: PracticeWord, requested: FlashcardMode | "mixed"): FlashcardMode {
  const candidates: FlashcardMode[] = ["flashcard_word_to_meaning", "flashcard_meaning_to_word"];
  if (word.synonyms.length > 0) candidates.push("flashcard_synonym_challenge");
  if (word.antonyms.length > 0) candidates.push("flashcard_antonym_challenge");
  if (word.examples.length > 0) candidates.push("flashcard_fill_blank");

  if (requested !== "mixed" && candidates.includes(requested)) return requested;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildOptions(correct: string, pool: string[]): string[] {
  const distractors = shuffle(pool.filter((w) => w.toLowerCase() !== correct.toLowerCase())).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

export function FlashcardSession({
  words,
  requestedMode,
  scopeLabel,
}: {
  words: PracticeWord[];
  requestedMode: FlashcardMode | "mixed";
  scopeLabel: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<{ again: number; hard: number; good: number; easy: number }>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const word = words[index];
  const mode = useMemo(() => (word ? resolveMode(word, requestedMode) : "flashcard_word_to_meaning"), [
    word,
    requestedMode,
  ]);
  const isFlipMode = mode === "flashcard_word_to_meaning" || mode === "flashcard_meaning_to_word";

  const allSynonymsPool = useMemo(() => words.flatMap((w) => w.synonyms), [words]);
  const allAntonymsPool = useMemo(() => words.flatMap((w) => w.antonyms), [words]);

  const synonymOptions = useMemo(
    () => (word && word.synonyms[0] ? buildOptions(word.synonyms[0], allSynonymsPool) : []),
    [word, allSynonymsPool],
  );
  const antonymOptions = useMemo(
    () => (word && word.antonyms[0] ? buildOptions(word.antonyms[0], allAntonymsPool) : []),
    [word, allAntonymsPool],
  );
  const blankSentence = useMemo(() => {
    if (!word || !word.examples[0]) return null;
    const re = new RegExp(`\\b${word.text}\\b`, "i");
    return word.examples[0].replace(re, "ـــ");
  }, [word]);

  if (!word) {
    const total = results.again + results.hard + results.good + results.easy;
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Session complete</h2>
        <p className="text-muted-foreground">
          {total} card{total === 1 ? "" : "s"} reviewed — {results.good + results.easy} solid, {results.hard} shaky,{" "}
          {results.again} to revisit.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/flashcards")}>
            Back to flashcards
          </Button>
          <Button onClick={() => router.push("/dashboard")}>Done</Button>
        </div>
      </div>
    );
  }

  function advance(rating: Rating) {
    setIsSubmitting(true);
    setResults((r) => ({ ...r, [rating]: r[rating] + 1 }));

    submitReview(word.userWordId, mode, rating)
      .then((result) => {
        if (!result.success) toast.error(result.error);
      })
      .finally(() => setIsSubmitting(false));

    setIndex((i) => i + 1);
    setFlipped(false);
    setTyped("");
    setSelectedOption(null);
    setChecked(false);
  }

  function checkTyped() {
    setChecked(true);
  }

  function checkOption(option: string) {
    setSelectedOption(option);
    setChecked(true);
  }

  const progress = (index / words.length) * 100;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{scopeLabel}</span>
          <span>
            {index + 1} / {words.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {(mode === "flashcard_word_to_meaning" || mode === "flashcard_meaning_to_word") && (
        <FlipCard
          front={mode === "flashcard_word_to_meaning" ? word.text : (word.definition ?? word.text)}
          back={mode === "flashcard_word_to_meaning" ? (word.definition ?? "") : word.text}
          frontIsWord={mode === "flashcard_word_to_meaning"}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          example={word.examples[0]}
        />
      )}

      {mode === "flashcard_fill_blank" && blankSentence && (
        <div className="shadow-brutal flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fill in the blank</p>
          <p className="text-lg">{blankSentence}</p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type the missing word…"
            disabled={checked}
            onKeyDown={(e) => e.key === "Enter" && !checked && checkTyped()}
            className={cn(
              "transition-all duration-150",
              checked && typed.trim().toLowerCase() !== word.text.toLowerCase() && "animate-shake border-destructive",
            )}
          />
          {checked ? (
            <p
              className={cn(
                "animate-in fade-in-0 slide-in-from-top-1 duration-200",
                typed.trim().toLowerCase() === word.text.toLowerCase() ? "text-emerald-600" : "text-destructive",
              )}
            >
              {typed.trim().toLowerCase() === word.text.toLowerCase()
                ? "Correct!"
                : `Not quite — it's "${word.text}".`}
            </p>
          ) : null}
        </div>
      )}

      {(mode === "flashcard_synonym_challenge" || mode === "flashcard_antonym_challenge") && (
        <div className="shadow-brutal flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {mode === "flashcard_synonym_challenge" ? "Pick the synonym" : "Pick the antonym"} of &ldquo;{word.text}
            &rdquo;
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(mode === "flashcard_synonym_challenge" ? synonymOptions : antonymOptions).map((option) => {
              const correctAnswer =
                mode === "flashcard_synonym_challenge" ? word.synonyms[0] : word.antonyms[0];
              const isCorrect = option.toLowerCase() === correctAnswer?.toLowerCase();
              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => checkOption(option)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-all duration-150 ease-out ${
                    checked && selectedOption === option
                      ? isCorrect
                        ? "scale-[1.02] border-emerald-500 bg-emerald-500/10"
                        : "animate-shake border-destructive bg-destructive/10"
                      : checked && isCorrect
                        ? "scale-[1.02] border-emerald-500 bg-emerald-500/10"
                        : "hover:scale-[1.02] hover:bg-accent active:scale-[0.98]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => speak(word.text)}>
          <Volume2 className="size-4" /> Listen
        </Button>
      </div>

      {isFlipMode ? (
        flipped ? (
          <RatingButtons isSubmitting={isSubmitting} onRate={advance} />
        ) : null
      ) : checked ? (
        <RatingButtons isSubmitting={isSubmitting} onRate={advance} />
      ) : mode === "flashcard_fill_blank" ? (
        <Button onClick={checkTyped} disabled={!typed.trim()}>
          Check
        </Button>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Pick an answer above.</p>
      )}
    </div>
  );
}

function RatingButtons({
  isSubmitting,
  onRate,
}: {
  isSubmitting: boolean;
  onRate: (rating: Rating) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Button variant="outline" disabled={isSubmitting} onClick={() => onRate("again")}>
        Again
      </Button>
      <Button variant="outline" disabled={isSubmitting} onClick={() => onRate("hard")}>
        Hard
      </Button>
      <Button variant="outline" disabled={isSubmitting} onClick={() => onRate("good")}>
        Good
      </Button>
      <Button variant="outline" disabled={isSubmitting} onClick={() => onRate("easy")}>
        Easy
      </Button>
    </div>
  );
}

function FlipCard({
  front,
  back,
  frontIsWord,
  flipped,
  onFlip,
  example,
}: {
  front: string;
  back: string;
  frontIsWord: boolean;
  flipped: boolean;
  onFlip: () => void;
  example?: string;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      disabled={flipped}
      className="shadow-brutal flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-foreground bg-card p-8 text-center transition-all duration-200 ease-out not-disabled:hover:-translate-y-0.5 not-disabled:hover:bg-accent/40 not-disabled:hover:shadow-brutal-lg not-disabled:active:translate-x-[3px] not-disabled:active:translate-y-[3px] not-disabled:active:shadow-none"
    >
      {!flipped ? (
        <>
          <p className={frontIsWord ? "text-3xl font-bold capitalize" : "text-lg"}>{front}</p>
          <p className="animate-pulse text-xs text-muted-foreground">
            <RotateCcw className="mr-1 inline size-3" />
            Tap to reveal
          </p>
        </>
      ) : (
        <div className="animate-in fade-in-0 zoom-in-95 flex flex-col items-center gap-3 duration-300">
          <p className={frontIsWord ? "text-lg" : "text-3xl font-bold capitalize"}>{back}</p>
          {example ? <p className="text-sm text-muted-foreground italic">&ldquo;{example}&rdquo;</p> : null}
        </div>
      )}
    </button>
  );
}
