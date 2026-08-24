import { CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AddWordDialog } from "@/components/vocabulary/add-word-dialog";

interface Props {
  wordsAdded: number;
  wordsTarget: number;
}

export function TodayGoalCard({ wordsAdded, wordsTarget }: Props) {
  const complete = wordsAdded >= wordsTarget;
  const remaining = Math.max(0, wordsTarget - wordsAdded);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">Today&apos;s goal</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">
            {wordsAdded} / {wordsTarget}
          </span>
          <span className="text-sm text-muted-foreground">words</span>
          {complete ? (
            <CheckCircle2 className="size-5 animate-pop text-emerald-500" aria-label="Complete" />
          ) : null}
        </div>
        <Progress
          value={Math.min(100, (wordsAdded / wordsTarget) * 100)}
          className="mt-3 max-w-xs transition-all duration-500 ease-out"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {complete
            ? "Nice work — you've hit today's goal."
            : `${remaining} more word${remaining === 1 ? "" : "s"} to go today.`}
        </p>
      </div>
      <AddWordDialog />
    </div>
  );
}
