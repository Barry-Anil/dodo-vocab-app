import Link from "next/link";
import type { Metadata } from "next";
import { FolderHeart } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listUserCollectionsWithCounts } from "@/lib/db/queries/words";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";

export const metadata: Metadata = { title: "Collections – Vocabulary Builder" };

export default async function CollectionsPage() {
  const user = await requireUser();
  const collections = await listUserCollectionsWithCounts(user.id);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground">Organize your words into custom folders.</p>
        </div>
        <CreateCollectionDialog />
      </div>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FolderHeart className="size-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">No collections yet</p>
            <p className="text-sm text-muted-foreground">
              Create one for IELTS, work, travel, or anything you&apos;re studying for.
            </p>
          </div>
          <CreateCollectionDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className="shadow-brutal flex flex-col gap-1 rounded-xl border-2 border-foreground bg-card p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-brutal-lg active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <span className="font-semibold">{collection.name}</span>
              {collection.description ? (
                <span className="line-clamp-2 text-sm text-muted-foreground">{collection.description}</span>
              ) : null}
              <span className="mt-2 text-xs text-muted-foreground">
                {collection.wordCount} {collection.wordCount === 1 ? "word" : "words"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
