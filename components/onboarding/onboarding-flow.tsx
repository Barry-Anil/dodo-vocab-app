"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { CEFR_LEVELS, LEARNING_GOALS, DAILY_TARGETS } from "@/lib/constants/preferences";
import type { CefrLevel } from "@/lib/ai/types";
import { completeOnboarding } from "@/lib/actions/preferences";

const STEPS = ["Your level", "Your goals", "Daily target", "Reminders"] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [cefrLevel, setCefrLevel] = useState<CefrLevel>("B1");
  const [goals, setGoals] = useState<string[]>([]);
  const [dailyWordTarget, setDailyWordTarget] = useState(2);
  const [reminderTime, setReminderTime] = useState("09:00");

  const isLastStep = step === STEPS.length - 1;

  function goNext() {
    setError(null);
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    startTransition(async () => {
      const result = await completeOnboarding({
        cefrLevel,
        learningGoals: goals,
        dailyWordTarget,
        reminderTime,
        timezone,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-300 ease-out">
      {step === 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">What&apos;s your English level?</legend>
          <RadioGroup
            value={cefrLevel}
            onValueChange={(value) => setCefrLevel(value as CefrLevel)}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {CEFR_LEVELS.map((level) => (
              <label
                key={level.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] has-[[data-checked]]:scale-[1.02] has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
              >
                <RadioGroupItem value={level.value} />
                <span>
                  <span className="font-medium">{level.label}</span>{" "}
                  <span className="text-muted-foreground">{level.description}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">Not sure? B1 (Intermediate) is a safe default.</p>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">What are you learning for?</legend>
          <ToggleGroup
            value={goals}
            onValueChange={setGoals}
            className="flex flex-wrap justify-start gap-2"
          >
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
          <p className="text-xs text-muted-foreground">Pick as many as apply. You can change these later.</p>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">How many new words per day?</legend>
          <RadioGroup
            value={String(dailyWordTarget)}
            onValueChange={(value) => setDailyWordTarget(Number(value))}
            className="grid grid-cols-4 gap-2"
          >
            {DAILY_TARGETS.map((target) => (
              <label
                key={target}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 transition-all duration-150 ease-out hover:scale-[1.03] hover:border-primary/40 active:scale-[0.97] has-[[data-checked]]:scale-[1.03] has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
              >
                <RadioGroupItem value={String(target)} />
                <span className="text-lg font-semibold">{target}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Quality over quantity — 2 words learned well beats 10 forgotten.
          </p>
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">When should we remind you?</legend>
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
          <p className="text-xs text-muted-foreground">
            You can fine-tune reminders (and turn them off) any time in Settings.
          </p>
        </fieldset>
      ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || isPending}>
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={isPending}>
          {isPending ? "Saving…" : isLastStep ? "Start learning" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
