import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/db/queries/preferences";
import { getMonthEntries, getDayDetail, monthRange } from "@/lib/db/queries/calendar";
import { todayInTimezone } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Calendar – Vocabulary Builder" };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_DOT: Record<string, string> = {
  COMPLETE: "bg-emerald-500",
  PARTIAL: "bg-amber-500",
  MISSED: "bg-rose-500",
  NOT_STARTED: "bg-transparent",
};

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);
  const timezone = preferences?.timezone ?? "UTC";
  const today = todayInTimezone(timezone);

  const params = await searchParams;
  const monthStr = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : today.slice(0, 7);
  const selectedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;

  const { start, year, month } = monthRange(monthStr);
  const [entries, { entry: dayEntry, wordsAdded }] = await Promise.all([
    getMonthEntries(user.id, monthStr),
    getDayDetail(user.id, selectedDate),
  ]);

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthLabel = new Date(`${start}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const cells: Array<{ date: string; day: number } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      date: `${monthStr}-${String(i + 1).padStart(2, "0")}`,
      day: i + 1,
    })),
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{monthLabel}</h1>
          <div className="flex gap-1">
            <Link
              href={`/calendar?month=${shiftMonth(monthStr, -1)}`}
              className="rounded-lg border p-1.5 transition-all duration-150 ease-out hover:bg-accent hover:scale-105 active:scale-95"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`/calendar?month=${shiftMonth(monthStr, 1)}`}
              className="rounded-lg border p-1.5 transition-all duration-150 ease-out hover:bg-accent hover:scale-105 active:scale-95"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} />;
            const entry = entries.get(cell.date);
            const isFuture = cell.date > today;
            const status = entry?.status ?? (isFuture ? "NOT_STARTED" : cell.date === today ? "NOT_STARTED" : "MISSED");
            const isSelected = cell.date === selectedDate;
            const isToday = cell.date === today;

            return (
              <Link
                key={cell.date}
                href={`/calendar?month=${monthStr}&date=${cell.date}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-all duration-150 ease-out hover:scale-[1.05] hover:bg-accent active:scale-95",
                  isSelected && "border-primary bg-primary/5",
                  isToday && !isSelected && "border-foreground/30",
                  !isSelected && !isToday && "border-transparent",
                )}
              >
                <span className={isFuture ? "text-muted-foreground/50" : ""}>{cell.day}</span>
                {!isFuture ? (
                  <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
                ) : (
                  <span className="size-1.5" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" /> Missed
          </span>
        </div>
      </div>

      <div className="w-full lg:w-80 lg:shrink-0">
        <div className="shadow-brutal rounded-xl border-2 border-foreground bg-card p-4">
          <h2 className="font-medium">
            {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </h2>

          {!dayEntry ? (
            <p className="mt-2 text-sm text-muted-foreground">No activity this day.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {dayEntry.wordsAdded}/{dayEntry.wordsTarget} words
                </Badge>
                {dayEntry.reviewsCompleted > 0 ? (
                  <Badge variant="outline">{dayEntry.reviewsCompleted} reviews</Badge>
                ) : null}
                {dayEntry.quizCompleted ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="size-3" /> Quiz done
                  </Badge>
                ) : null}
              </div>

              {wordsAdded.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Words added
                  </p>
                  <ul className="flex flex-col gap-1">
                    {wordsAdded.map(({ word }) => (
                      <li key={word.id}>
                        <Link
                          href={`/vocabulary/${word.id}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-accent"
                        >
                          <Circle className="size-2 fill-current text-muted-foreground" />
                          <span className="capitalize">{word.text}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
