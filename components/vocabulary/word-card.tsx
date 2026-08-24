import Link from "next/link";
import { Heart, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WordStatus } from "@/db/schema";

const STATUS_LABEL: Record<WordStatus, string> = {
  NEW: "New",
  LEARNING: "Learning",
  REVIEW: "Review",
  MASTERED: "Mastered",
};

const STATUS_CLASS: Record<WordStatus, string> = {
  NEW: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  LEARNING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  REVIEW: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  MASTERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

interface WordCardProps {
  wordId: string;
  text: string;
  partOfSpeech: string | null;
  definition: string | null;
  cefrLevel: string | null;
  status: WordStatus;
  isFavorite: boolean;
  isWeak: boolean;
  isDue: boolean;
}

export function WordCard({
  wordId,
  text,
  partOfSpeech,
  definition,
  cefrLevel,
  status,
  isFavorite,
  isWeak,
  isDue,
}: WordCardProps) {
  return (
    <Link
      href={`/vocabulary/${wordId}`}
      className="shadow-brutal group flex flex-col gap-2 rounded-xl border-2 border-foreground bg-card p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-brutal-lg active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold capitalize">{text}</span>
          {partOfSpeech ? (
            <span className="ml-2 text-xs text-muted-foreground italic">{partOfSpeech}</span>
          ) : null}
        </div>
        {isFavorite ? <Heart className="size-4 shrink-0 fill-rose-500 text-rose-500" aria-label="Favorite" /> : null}
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{definition ?? "Generating details…"}</p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {cefrLevel ? (
          <Badge variant="outline" className="font-mono">
            {cefrLevel}
          </Badge>
        )
        : null}
        <Badge className={cn("border-0", STATUS_CLASS[status])} variant="secondary">
          {STATUS_LABEL[status]}
        </Badge>
        {isWeak ? (
          <Badge variant="destructive" className="border-0">
            Weak
          </Badge>
        ) : null}
        {isDue ? (
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            Due
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}
