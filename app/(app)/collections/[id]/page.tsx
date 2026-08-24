import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getCollectionWithWords } from "@/lib/db/queries/words";
import { Badge } from "@/components/ui/badge";
import { DeleteCollectionButton, RemoveWordButton } from "@/components/collections/collection-detail-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const data = await getCollectionWithWords(user.id, id);
  return { title: data ? `${data.collection.name} – Vocabulary Builder` : "Collection – Vocabulary Builder" };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const data = await getCollectionWithWords(user.id, id);
  if (!data) notFound();

  const { collection, items } = data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{collection.name}</h1>
          {collection.description ? <p className="text-sm text-muted-foreground">{collection.description}</p> : null}
        </div>
        <DeleteCollectionButton collectionId={collection.id} name={collection.name} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="font-medium">No words in this collection yet</p>
          <p className="text-sm text-muted-foreground">
            Add words from any word&apos;s detail page in your{" "}
            <Link href="/vocabulary" className="underline">
              vocabulary
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ word }) => (
            <li
              key={word.id}
              className="flex items-center justify-between gap-3 rounded-lg border-2 border-foreground/15 bg-card px-3 py-2 transition-colors hover:border-foreground/40"
            >
              <Link href={`/vocabulary/${word.id}`} className="flex-1">
                <span className="font-medium capitalize">{word.text}</span>{" "}
                <span className="text-sm text-muted-foreground">{word.definition}</span>
              </Link>
              {word.cefrLevel ? (
                <Badge variant="outline" className="font-mono">
                  {word.cefrLevel}
                </Badge>
              ) : null}
              <RemoveWordButton collectionId={collection.id} wordId={word.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
