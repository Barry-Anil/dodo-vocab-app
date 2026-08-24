"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { submitQuiz } from "@/lib/actions/quiz";
import { cn } from "@/lib/utils";
import { celebrateQuizComplete } from "@/lib/toast-celebrations";

export interface QuizQuestionView {
  id: string;
  questionText: string;
  options: string[] | null;
}

export function QuizTaker({ quizId, questions }: { quizId: string; questions: QuizQuestionView[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [typed, setTyped] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const currentAnswer = question.options ? answers[question.id] : typed;

  function selectOption(option: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  }

  function goNext() {
    if (!question.options) {
      setAnswers((prev) => ({ ...prev, [question.id]: typed }));
    }
    setTyped("");
    setIndex((i) => i + 1);
  }

  function submit() {
    const finalAnswers = { ...answers };
    if (!question.options) finalAnswers[question.id] = typed;

    startTransition(async () => {
      const result = await submitQuiz(quizId, finalAnswers);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      celebrateQuizComplete(result.score, result.correctCount, result.total);
      router.push(`/quiz/${quizId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {index + 1}</span>
          <span>
            {index + 1} / {questions.length}
          </span>
        </div>
        <Progress value={((index + 1) / questions.length) * 100} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-lg">{question.questionText}</p>
      </div>

      {question.options ? (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectOption(option)}
              className={cn(
                "rounded-lg border px-4 py-2.5 text-left text-sm transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-accent active:scale-[0.99]",
                answers[question.id] === option && "border-primary bg-primary/5 scale-[1.01]",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type your answer…"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && currentAnswer && (isLast ? submit() : goNext())}
        />
      )}

      <Button disabled={!currentAnswer || isSubmitting} onClick={isLast ? submit : goNext}>
        {isSubmitting ? "Submitting…" : isLast ? "Finish quiz" : "Next"}
      </Button>
    </div>
  );
}
