import type { Metadata } from "next";
import { BookOpen, CheckCircle2, Clock, Flame, Target, ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import {
  getProgressOverview,
  getWordsPerWeek,
  getMasteryDistribution,
  getAccuracyByCategory,
} from "@/lib/db/queries/progress";
import { todayInTimezone } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { WeeklyBarChart } from "@/components/progress/weekly-bar-chart";
import { HorizontalBarList } from "@/components/progress/horizontal-bar";

export const metadata: Metadata = { title: "Progress – Vocabulary Builder" };

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  LEARNING: "Learning",
  REVIEW: "Review",
  MASTERED: "Mastered",
};

export default async function ProgressPage() {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";
  const today = todayInTimezone(timezone);

  const [overview, weeklyWords, mastery, categoryAccuracy] = await Promise.all([
    getProgressOverview(user.id, today),
    getWordsPerWeek(user.id, today),
    getMasteryDistribution(user.id),
    getAccuracyByCategory(user.id),
  ]);

  const masteryTotal = Object.values(mastery).reduce((a, b) => a + b, 0) || 1;
  const masteryRows = Object.entries(mastery).map(([status, count]) => ({
    label: STATUS_LABEL[status],
    value: count / masteryTotal,
    displayValue: String(count),
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress & insights</h1>
        <p className="text-sm text-muted-foreground">How your vocabulary is actually growing.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total words" value={overview.bankStats.total} icon={BookOpen} />
        <StatTile label="Mastered" value={overview.bankStats.mastered} icon={CheckCircle2} accent="emerald" />
        <StatTile label="Needs review" value={overview.bankStats.needsReview} icon={Clock} accent="rose" />
        <StatTile label="Streak" value={`${overview.streak.current}d`} icon={Flame} accent="amber" />
        <StatTile label="Added this week" value={overview.wordsThisWeek} icon={Target} />
        <StatTile label="Added this month" value={overview.wordsThisMonth} icon={Target} />
        <StatTile
          label="Review accuracy"
          value={overview.reviewAccuracy != null ? `${Math.round(overview.reviewAccuracy * 100)}%` : "—"}
          icon={CheckCircle2}
        />
        <StatTile
          label="Quiz accuracy"
          value={overview.quizAccuracy != null ? `${Math.round(overview.quizAccuracy)}%` : "—"}
          icon={ClipboardCheck}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Words learned per week</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyBarChart data={weeklyWords} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mastery progression</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList rows={masteryRows} emptyMessage="No words yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accuracy by category</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              rows={categoryAccuracy.map((c) => ({ label: c.name, value: c.accuracy }))}
              emptyMessage="Review some words to see this breakdown."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
