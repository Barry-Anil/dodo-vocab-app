"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { addDays, weekStartFor } from "@/lib/date";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DailyTotal {
  date: string;
  seconds: number;
}

interface Bucket {
  label: string;
  seconds: number;
  isCurrent: boolean;
}

type View = "week" | "month";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function labelForWeek(weekStart: string): string {
  const [, m, d] = weekStart.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`; // "Feb 3"
}

function buildWeekBuckets(totals: DailyTotal[], today: string, count = 10): Bucket[] {
  const thisWeekStart = weekStartFor(today);
  const buckets: Bucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(thisWeekStart, -7 * i);
    const end = addDays(start, 6);
    const seconds = totals
      .filter((t) => t.date >= start && t.date <= end)
      .reduce((sum, t) => sum + t.seconds, 0);
    buckets.push({ label: labelForWeek(start), seconds, isCurrent: i === 0 });
  }
  return buckets;
}

function buildMonthBuckets(totals: DailyTotal[], today: string, count = 8): Bucket[] {
  const [ty, tm] = today.split("-").map(Number);
  const buckets: Bucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const monthIndex = tm - 1 - i;
    const year = ty + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const seconds = totals
      .filter((t) => t.date.startsWith(prefix))
      .reduce((sum, t) => sum + t.seconds, 0);
    const label = month === 0 || year !== ty ? `${MONTHS[month]} '${String(year).slice(2)}` : MONTHS[month];
    buckets.push({ label, seconds, isCurrent: i === 0 });
  }
  return buckets;
}

function TrendPill({ buckets, unit }: { buckets: Bucket[]; unit: string }) {
  if (buckets.length < 2) return null;
  const current = buckets[buckets.length - 1].seconds;
  const previous = buckets[buckets.length - 2].seconds;

  let tone: "up" | "down" | "flat";
  let text: string;
  if (previous === 0) {
    tone = current > 0 ? "up" : "flat";
    text = current > 0 ? "New focus time" : "No focus time yet";
  } else {
    const change = (current - previous) / previous;
    const pct = Math.round(Math.abs(change) * 100);
    if (pct < 3) {
      tone = "flat";
      text = `About the same as last ${unit}`;
    } else {
      tone = change > 0 ? "up" : "down";
      text = `${change > 0 ? "Up" : "Down"} ${pct}% vs last ${unit}`;
    }
  }

  const Icon = tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "up" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "down" && "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        tone === "flat" && "border-foreground/15 bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

export function StudyTrendChart({
  dailyTotals,
  today,
}: {
  dailyTotals: DailyTotal[];
  today: string;
}) {
  const [view, setView] = useState<View>("week");

  const buckets = useMemo(
    () => (view === "week" ? buildWeekBuckets(dailyTotals, today) : buildMonthBuckets(dailyTotals, today)),
    [view, dailyTotals, today],
  );

  const max = Math.max(1, ...buckets.map((b) => b.seconds));
  const hasAnyData = buckets.some((b) => b.seconds > 0);
  const unit = view === "week" ? "week" : "month";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TrendPill buckets={buckets} unit={unit} />
        <div className="inline-flex rounded-lg border-2 border-foreground p-0.5 text-xs font-medium">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-2.5 py-1 capitalize transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {hasAnyData ? (
        <div className="flex h-48 items-end gap-1.5">
          {buckets.map((b, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                {b.seconds > 0 ? formatDuration(b.seconds) : ""}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all",
                    b.isCurrent ? "bg-primary" : "bg-primary/50",
                  )}
                  style={{ height: `${Math.max(2, (b.seconds / max) * 100)}%` }}
                  title={`${b.label}: ${formatDuration(b.seconds)}`}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-muted-foreground">No focus time logged yet.</p>
          <p className="text-xs text-muted-foreground">Finish a focus block and it&apos;ll show up here.</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        The last bar is the current {unit} so far.
      </p>
    </div>
  );
}
