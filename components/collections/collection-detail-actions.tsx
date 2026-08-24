"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCollection, removeWordFromCollection } from "@/lib/actions/collections";

export function DeleteCollectionButton({ collectionId, name }: { collectionId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCollection(collectionId);
      if (!result.success) {
        toast.error(result.error);
        setConfirmOpen(false);
        return;
      }
      router.push("/collections");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4" /> Delete collection
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this collection?"
        description={`Delete "${name}"? Words themselves stay in your vocabulary — only the collection is removed.`}
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function RemoveWordButton({ collectionId, wordId }: { collectionId: string; wordId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label="Remove from collection"
      onClick={() => {
        startTransition(async () => {
          const result = await removeWordFromCollection(collectionId, wordId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <X className="size-4" />
    </Button>
  );
}
