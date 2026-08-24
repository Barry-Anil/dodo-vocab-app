import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listUserWords, listAllCategories } from "@/lib/db/queries/words";
import { AddWordDialog } from "@/components/vocabulary/add-word-dialog";
import { WordBankFilters } from "@/components/vocabulary/word-bank-filters";
import { WordCard } from "@/components/vocabulary/word-card";

export const metadata: Metadata = { title: "Vocabulary – Vocabulary Builder" };

interface SearchParams {
  q?: string;
  category?: string;
  status?: string;
  favorites?: string;
  due?: string;
  weak?: string;
}

const VALID_STATUSES = ["NEW", "LEARNING", "REVIEW", "MASTERED"] as const;

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const status = VALID_STATUSES.find((s) => s === params.status);

  const [rows, categories] = await Promise.all([
    listUserWords(user.id, {
      search: params.q,
      categorySlug: params.category,
      status,
      favoritesOnly: params.favorites === "1",
      dueOnly: params.due === "1",
      weakOnly: params.weak === "1",
    }),
    listAllCategories(user.id),
  ]);

  // Server Component executed once per request, not a re-rendered component
  // — a request-time snapshot is exactly what "is this word due right now"
  // needs.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vocabulary</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "word" : "words"} in your bank
          </p>
        </div>
        <AddWordDialog />
      </div>

      <WordBankFilters categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">
              {params.q || params.category || params.status || params.favorites || params.due || params.weak
                ? "No words match these filters"
                : "You haven't added any words yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {params.q || params.category || params.status || params.favorites || params.due || params.weak
                ? "Try a different search or clear filters."
                : "Add your first word to start building your vocabulary."}
            </p>
          </div>
          <AddWordDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ userWord, word }) => (
            <WordCard
              key={userWord.id}
              wordId={word.id}
              text={word.text}
              partOfSpeech={word.partOfSpeech}
              definition={word.definition}
              cefrLevel={word.cefrLevel}
              status={userWord.status}
              isFavorite={userWord.isFavorite}
              isWeak={userWord.isWeak}
              isDue={Boolean(userWord.nextReviewAt && userWord.nextReviewAt.getTime() <= now)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
