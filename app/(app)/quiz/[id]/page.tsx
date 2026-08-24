import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getQuizWithQuestions, getLatestAttemptWithAnswers } from "@/lib/db/queries/quizzes";
import { QuizTaker } from "@/components/quiz/quiz-taker";
import { QuizResults } from "@/components/quiz/quiz-results";

export const metadata: Metadata = { title: "Quiz – Vocabulary Builder" };

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const data = await getQuizWithQuestions(user.id, id);
  if (!data) notFound();

  const { quiz, questions } = data;

  if (quiz.status === "completed") {
    const attemptData = await getLatestAttemptWithAnswers(quiz.id);
    return (
      <div className="p-6">
        <QuizResults
          score={quiz.score}
          questions={questions.map((q) => ({ id: q.id, questionText: q.questionText, correctAnswer: q.correctAnswer }))}
          answers={attemptData?.answers ?? []}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <QuizTaker
        quizId={quiz.id}
        questions={questions.map((q) => ({ id: q.id, questionText: q.questionText, options: q.options }))}
      />
    </div>
  );
}
