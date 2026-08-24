"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { updateNotificationPreferences } from "@/lib/actions/preferences";

interface Props {
  dailyReminderEnabled: boolean;
  reviewDueReminderEnabled: boolean;
  weeklyQuizReminderEnabled: boolean;
  weeklyReportEnabled: boolean;
  streakRiskReminderEnabled: boolean;
  secondReminderEnabled: boolean;
  secondReminderTime: string;
}

const TOGGLES: Array<{ key: keyof Omit<Props, "secondReminderTime">; label: string; description: string }> = [
  {
    key: "dailyReminderEnabled",
    label: "Daily reminder",
    description: "A nudge if you haven't added today's words yet.",
  },
  {
    key: "reviewDueReminderEnabled",
    label: "Review due",
    description: "Let me know when words are due for review.",
  },
  {
    key: "weeklyQuizReminderEnabled",
    label: "Weekly quiz",
    description: "Remind me when a new weekly quiz is ready.",
  },
  {
    key: "weeklyReportEnabled",
    label: "Weekly report",
    description: "A summary of my progress each week.",
  },
  {
    key: "streakRiskReminderEnabled",
    label: "Streak at risk",
    description: "Warn me before my streak resets.",
  },
  {
    key: "secondReminderEnabled",
    label: "Second daily reminder",
    description: "An evening nudge if I still haven't hit today's goal.",
  },
];

export function NotificationPreferencesForm(props: Props) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(props);

  function save(next: typeof state) {
    const previous = state;
    setState(next);

    startTransition(async () => {
      const result = await updateNotificationPreferences(next);
      if (!result.success) {
        toast.error(result.error);
        setState(previous); // revert on failure
      }
    });
  }

  function toggle(key: keyof Omit<Props, "secondReminderTime">, value: boolean) {
    save({ ...state, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      {TOGGLES.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor={item.key} className="font-medium">
              {item.label}
            </Label>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <Switch
            id={item.key}
            checked={state[item.key]}
            onCheckedChange={(checked) => toggle(item.key, checked)}
            disabled={isPending}
          />
        </div>
      ))}

      {state.secondReminderEnabled ? (
        <div className="flex flex-col gap-2 border-t pt-4">
          <Label htmlFor="secondReminderTime">Second reminder time</Label>
          <Input
            id="secondReminderTime"
            type="time"
            defaultValue={state.secondReminderTime}
            className="w-40"
            onBlur={(e) => save({ ...state, secondReminderTime: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
