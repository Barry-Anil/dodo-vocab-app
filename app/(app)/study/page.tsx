import type { Metadata } from "next";
import { Timer, Flame, CalendarDays, CalendarRange, Hourglass } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { getStudyOverview, getDailyStudyTotals } from "@/lib/db/queries/study";
import { todayInTimezone, addDays } from "@/lib/date";
import { formatDuration } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PomodoroTimer } from "@/components/study/pomodoro-timer";
import { StudyTrendChart } from "@/components/study/study-trend-chart";

export const metadata: Metadata = { title: "Study Timer – Vocabulary Builder" };

export default async function StudyPage() {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";
  const today = todayInTimezone(timezone);

  const [overview, dailyTotals] = await Promise.all([
    getStudyOverview(user.id, today),
    getDailyStudyTotals(user.id, addDays(today, -364), today),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Study timer</h1>
        <p className="text-sm text-muted-foreground">
          Focus in Pomodoro blocks. Every finished block is logged to the day it happened.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PomodoroTimer todaySeconds={overview.todaySeconds} todaySessions={overview.todaySessions} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatTile label="Today" value={formatDuration(overview.todaySeconds)} icon={Timer} />
          <StatTile label="This week" value={formatDuration(overview.weekSeconds)} icon={CalendarDays} accent="emerald" />
          <StatTile label="This month" value={formatDuration(overview.monthSeconds)} icon={CalendarRange} />
          <StatTile label="Focus streak" value={`${overview.streak}d`} icon={Flame} accent="amber" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Focus time trend</CardTitle>
        </CardHeader>
        <CardContent>
          <StudyTrendChart dailyTotals={dailyTotals} today={today} />
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Hourglass className="size-3.5" aria-hidden="true" />
        All-time focus logged: {formatDuration(overview.allTimeSeconds)}
      </p>
    </div>
  );
}
