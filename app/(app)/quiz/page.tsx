import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, History } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { getQuizForWeek, getQuizHistory } from "@/lib/db/queries/quizzes";
import { todayInTimezone, weekStartFor } from "@/lib/date";
import { GenerateQuizButton } from "@/components/quiz/generate-quiz-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Weekly Quiz – Vocabulary Builder" };

export default async function QuizPage() {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";
  const weekStartDate = weekStartFor(todayInTimezone(timezone));

  const [thisWeekQuiz, history] = await Promise.all([
    getQuizForWeek(user.id, weekStartDate),
    getQuizHistory(user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly quiz</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated from this week&apos;s vocabulary, with weak words carried over.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-12 text-center">
        <ClipboardCheck className="size-8 text-muted-foreground" />
        {!thisWeekQuiz ? (
          <>
            <p className="font-medium">No quiz for this week yet</p>
            <GenerateQuizButton />
          </>
        ) : thisWeekQuiz.status === "completed" ? (
          <>
            <p className="font-medium">This week&apos;s quiz — {thisWeekQuiz.score}%</p>
            <Link href={`/quiz/${thisWeekQuiz.id}`} className="text-sm font-medium underline">
              View results
            </Link>
          </>
        ) : (
          <>
            <p className="font-medium">Your quiz is ready</p>
            <Link
              href={`/quiz/${thisWeekQuiz.id}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Continue quiz
            </Link>
          </>
        )}
      </div>

      {history.length > 0 ? (
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="size-4" /> Past quizzes
          </h2>
          <ul className="flex flex-col gap-1.5">
            {history.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/quiz/${quiz.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-accent active:translate-x-0 active:scale-[0.99]"
                >
                  <span>{quiz.title ?? `Week of ${quiz.weekStartDate}`}</span>
                  <Badge variant={quiz.score && quiz.score >= 70 ? "secondary" : "outline"}>{quiz.score}%</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
