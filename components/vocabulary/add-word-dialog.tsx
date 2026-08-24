"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addWords } from "@/lib/actions/words";
import { celebrateWordAdded, celebrateDailyGoalComplete } from "@/lib/toast-celebrations";

export function AddWordDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const wordCount = text.split(/[\n,]/).map((w) => w.trim()).filter(Boolean).length;
    setStatus(
      wordCount > 1
        ? `Generating details for ${wordCount} words…`
        : "Analyzing word, generating examples, finding synonyms…",
    );

    startTransition(async () => {
      const result = await addWords({ text });
      setStatus(null);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const added = result.outcomes.filter((o) => o.status === "added");
      const failed = result.outcomes.filter((o) => o.error);
      const alreadyIn = result.outcomes.filter((o) => o.status === "already_in_bank" && !o.error);

      if (added.length > 0) {
        celebrateWordAdded(
          added.length === 1
            ? `Added "${added[0].text}" to your word bank`
            : `Added ${added.length} words to your word bank`,
        );
      }
      if (alreadyIn.length > 0) {
        toast.info(`${alreadyIn.map((o) => o.text).join(", ")} ${alreadyIn.length === 1 ? "is" : "are"} already in your bank`);
      }
      if (failed.length > 0) {
        failed.forEach((o) => toast.error(`"${o.text}": ${o.error}`));
      }

      if (added.length > 0) {
        // Slightly delayed so it doesn't visually collide with the "word
        // added" toast above — this one is the bigger moment.
        if (result.dailyGoalJustCompleted) {
          setTimeout(() => celebrateDailyGoalComplete(), 400);
        }
        setText("");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Add word
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add vocabulary</DialogTitle>
          <DialogDescription>
            Enter one word, or several separated by commas or new lines (up to 10 at once). AI
            will generate the definition, examples, synonyms, and more.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="word-text" className="sr-only">
              Word or words
            </Label>
            <Textarea
              id="word-text"
              placeholder={"reluctant\nambiguous, convey"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              autoFocus
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              {status}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !text.trim()}>
              {isPending ? "Generating…" : "Add to vocabulary"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
