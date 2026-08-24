"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateWordNotes } from "@/lib/actions/words";

export function WordNotes({ userWordId, initialNotes }: { userWordId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();

  const dirty = notes !== saved;

  function save() {
    startTransition(async () => {
      const result = await updateWordNotes(userWordId, notes);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSaved(notes);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add a personal note, example sentence, or memory trick for this word…"
        rows={3}
      />
      {dirty ? (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save note"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
