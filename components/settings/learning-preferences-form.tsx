"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CEFR_LEVELS, LEARNING_GOALS, DAILY_TARGETS } from "@/lib/constants/preferences";
import type { CefrLevel } from "@/lib/ai/types";
import { updateLearningPreferences } from "@/lib/actions/preferences";

interface Props {
  cefrLevel: CefrLevel;
  learningGoals: string[];
  dailyWordTarget: number;
  reminderTime: string;
  timezone: string;
}

export function LearningPreferencesForm({
  cefrLevel: initialLevel,
  learningGoals: initialGoals,
  dailyWordTarget: initialTarget,
  reminderTime: initialReminderTime,
  timezone,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(initialLevel);
  const [goals, setGoals] = useState<string[]>(initialGoals);
  const [dailyWordTarget, setDailyWordTarget] = useState(String(initialTarget));
  const [reminderTime, setReminderTime] = useState(initialReminderTime);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateLearningPreferences({
        cefrLevel,
        learningGoals: goals,
        dailyWordTarget: Number(dailyWordTarget),
        reminderTime,
        timezone,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Learning preferences updated");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cefrLevel">English level</Label>
          <Select value={cefrLevel} onValueChange={(v) => v && setCefrLevel(v as CefrLevel)}>
            <SelectTrigger id="cefrLevel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CEFR_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label} — {level.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dailyWordTarget">Daily word target</Label>
          <Select value={dailyWordTarget} onValueChange={(v) => v && setDailyWordTarget(v)}>
            <SelectTrigger id="dailyWordTarget" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAILY_TARGETS.map((target) => (
                <SelectItem key={target} value={String(target)}>
                  {target} words / day
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Learning goals</Label>
        <ToggleGroup value={goals} onValueChange={setGoals} className="flex flex-wrap justify-start gap-2">
          {LEARNING_GOALS.map((goal) => (
            <ToggleGroupItem
              key={goal.value}
              value={goal.value}
              className="rounded-full border px-4 py-2 text-sm transition-all duration-150 ease-out hover:scale-105 active:scale-95 aria-pressed:scale-105 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
            >
              {goal.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reminderTime">Daily reminder time</Label>
        <Input
          id="reminderTime"
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          className="w-40"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
