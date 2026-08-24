"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Volume2, Heart, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  toggleFavorite,
  markWordKnown,
  markForReviewLater,
  removeWordFromBank,
} from "@/lib/actions/words";

interface Props {
  userWordId: string;
  wordText: string;
  isFavorite: boolean;
  status: string;
}

/** Browser SpeechSynthesis — no API cost, no dependency, works offline. */
function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function WordActions({ userWordId, wordText, isFavorite, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [favorite, setFavorite] = useState(isFavorite);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRemove() {
    startTransition(async () => {
      const result = await removeWordFromBank(userWordId);
      if (!result.success) {
        toast.error(result.error);
        setConfirmOpen(false);
        return;
      }
      toast.success("Removed from your word bank");
      router.push("/vocabulary");
    });
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => speak(wordText)}>
        <Volume2 className="size-4" /> Listen
      </Button>

      <Button
        type="button"
        variant={favorite ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        onClick={() => {
          setFavorite((f) => !f);
          run(() => toggleFavorite(userWordId), favorite ? "Removed from favorites" : "Added to favorites");
        }}
      >
        <Heart className={cn("size-4 transition-transform duration-200", favorite && "scale-110 animate-pop fill-current")} />
        {favorite ? "Favorited" : "Favorite"}
      </Button>

      {status !== "MASTERED" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => markWordKnown(userWordId), "Marked as known")}
        >
          <CheckCircle2 className="size-4" /> Mark as known
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => run(() => markForReviewLater(userWordId), "Scheduled for review")}
      >
        <Clock className="size-4" /> Review later
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4" /> Remove
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this word?"
        description={`Remove "${wordText}" from your word bank? Your review history for it will be lost.`}
        confirmLabel="Remove"
        destructive
        isPending={isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
