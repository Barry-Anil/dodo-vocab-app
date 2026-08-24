import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ResultQuestion {
  id: string;
  questionText: string;
  correctAnswer: string;
}

interface ResultAnswer {
  quizQuestionId: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

export function QuizResults({
  score,
  questions,
  answers,
}: {
  score: number | null;
  questions: ResultQuestion[];
  answers: ResultAnswer[];
}) {
  const answerByQuestion = new Map(answers.map((a) => [a.quizQuestionId, a]));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="shadow-brutal-lg flex flex-col items-center gap-2 rounded-xl border-2 border-foreground bg-card p-8 text-center">
        <p className="text-4xl font-bold tracking-tight">{score ?? 0}%</p>
        <p className="text-sm text-muted-foreground">
          {answers.filter((a) => a.isCorrect).length} of {questions.length} correct
        </p>
        <Progress value={score ?? 0} className="mt-2 w-full max-w-xs" />
      </div>

      <div className="flex flex-col gap-2">
        {questions.map((q) => {
          const answer = answerByQuestion.get(q.id);
          return (
            <div key={q.id} className="rounded-lg border-2 border-foreground/15 bg-card p-3">
              <div className="flex items-start gap-2">
                {answer?.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                )}
                <div className="flex-1">
                  <p className="text-sm">{q.questionText}</p>
                  {!answer?.isCorrect ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      You answered &ldquo;{answer?.userAnswer || "—"}&rdquo; — correct answer:{" "}
                      <span className="font-medium text-foreground">{q.correctAnswer}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-3">
        <Link href="/quiz" className="text-sm font-medium underline">
          Back to quizzes
        </Link>
        <Link href="/vocabulary" className="text-sm font-medium underline">
          Review missed words
        </Link>
      </div>
    </div>
  );
}
