import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "amber" | "emerald" | "rose";
}

const ACCENT_CLASS: Record<NonNullable<Props["accent"]>, string> = {
  default: "text-foreground",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
};

export function StatTile({ label, value, icon: Icon, accent = "default" }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <Icon className={cn("size-4", ACCENT_CLASS[accent])} aria-hidden="true" />
      </div>
      <span className={cn("text-2xl font-semibold tracking-tight", ACCENT_CLASS[accent])}>{value}</span>
    </div>
  );
}
