"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FolderHeart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addWordToCollection, removeWordFromCollection } from "@/lib/actions/collections";

interface Collection {
  id: string;
  name: string;
}

export function AddToCollection({
  wordId,
  collections,
  memberOf,
}: {
  wordId: string;
  collections: Collection[];
  memberOf: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(new Set(memberOf));

  function toggle(collectionId: string) {
    const isMember = selected.has(collectionId);
    const next = new Set(selected);
    if (isMember) next.delete(collectionId);
    else next.add(collectionId);
    setSelected(next);

    startTransition(async () => {
      const result = isMember
        ? await removeWordFromCollection(collectionId, wordId)
        : await addWordToCollection(collectionId, wordId);
      if (!result.success) {
        toast.error(result.error);
        setSelected(selected); // revert
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm" disabled={isPending}>
            <FolderHeart className="size-4" /> Collections
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {collections.length === 0 ? (
          <DropdownMenuItem
            render={<Link href="/collections">Create your first collection</Link>}
          />
        ) : (
          collections.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={(e) => {
                e.preventDefault();
                toggle(c.id);
              }}
            >
              <span className="flex-1">{c.name}</span>
              {selected.has(c.id) ? <Check className="size-3.5" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
