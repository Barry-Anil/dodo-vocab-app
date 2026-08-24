"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCollection, removeWordFromCollection } from "@/lib/actions/collections";

export function DeleteCollectionButton({ collectionId, name }: { collectionId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete the collection "${name}"? Words themselves stay in your vocabulary.`)) return;
        startTransition(async () => {
          const result = await deleteCollection(collectionId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          router.push("/collections");
        });
      }}
    >
      <Trash2 className="size-4" /> Delete collection
    </Button>
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
