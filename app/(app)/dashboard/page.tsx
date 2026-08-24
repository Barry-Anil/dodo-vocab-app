import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, CheckCircle2, Clock, Flame, RotateCcw, ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/db/queries/dashboard";
import { Button } from "@/components/ui/button";
import { TodayGoalCard } from "@/components/dashboard/today-goal-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RecommendedWords } from "@/components/dashboard/recommended-words";
import { WordMiniList } from "@/components/dashboard/word-mini-list";

export const metadata: Metadata = { title: "Dashboard – Vocabulary Builder" };

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  const firstName = user.name?.split(" ")[0] ?? "there";
  const today = new Date();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(today.getHours())}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <TodayGoalCard wordsAdded={data.today.wordsAdded} wordsTarget={data.today.wordsTarget} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Streak" value={`${data.streak.current}d`} icon={Flame} accent="amber" />
        <StatTile label="Vocabulary bank" value={data.bankStats.total} icon={BookOpen} />
        <StatTile label="Mastered" value={data.bankStats.mastered} icon={CheckCircle2} accent="emerald" />
        <StatTile label="Needs review" value={data.bankStats.needsReview} icon={Clock} accent="rose" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/vocabulary">
              <BookOpen className="size-4" /> Continue learning
            </Link>
          }
        />
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/review">
              <RotateCcw className="size-4" /> Start review
              {data.hasDueReviews ? <span className="ml-1 size-1.5 rounded-full bg-primary" /> : null}
            </Link>
          }
        />
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/quiz">
              <ClipboardCheck className="size-4" /> Take quiz
            </Link>
          }
        />
      </div>

      <RecommendedWords />

      <div className="grid gap-4 md:grid-cols-2">
        <WordMiniList
          title="Recently added"
          emptyMessage="Words you add will show up here."
          words={data.recentWords.map((r) => ({
            wordId: r.word.id,
            text: r.word.text,
            definition: r.word.definition,
            cefrLevel: r.word.cefrLevel,
          }))}
        />
        <WordMiniList
          title="Weak words"
          emptyMessage="No weak words right now — nice work."
          words={data.weakWords.map((r) => ({
            wordId: r.word.id,
            text: r.word.text,
            definition: r.word.definition,
            cefrLevel: r.word.cefrLevel,
          }))}
        />
      </div>
    </div>
  );
}
