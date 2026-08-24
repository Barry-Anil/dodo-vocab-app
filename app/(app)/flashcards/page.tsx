import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listUserWords, listAllCategories } from "@/lib/db/queries/words";
import { FlashcardSession, type FlashcardMode } from "@/components/flashcards/flashcard-session";
import { FlashcardSetup } from "@/components/flashcards/flashcard-setup";

export const metadata: Metadata = { title: "Flashcards – Vocabulary Builder" };

const SCOPE_LABEL: Record<string, string> = {
  new: "Recently added words",
  weak: "Weak words",
  favorites: "Favorites",
  all: "All vocabulary",
  category: "Category",
};

interface SearchParams {
  scope?: string;
  mode?: string;
  category?: string;
  start?: string;
}

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const categories = await listAllCategories(user.id);

  if (!params.start || !params.scope) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">Choose what to practice and how.</p>
        </div>
        <FlashcardSetup categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
      </div>
    );
  }

  const scope = params.scope;
  const rows = await listUserWords(user.id, {
    status: scope === "new" ? "NEW" : undefined,
    weakOnly: scope === "weak",
    favoritesOnly: scope === "favorites",
    categorySlug: scope === "category" ? params.category : undefined,
  });

  const words = rows.slice(0, 20).map(({ userWord, word }) => ({
    userWordId: userWord.id,
    text: word.text,
    partOfSpeech: word.partOfSpeech,
    definition: word.definition,
    examples: word.examples,
    synonyms: word.synonyms,
    antonyms: word.antonyms,
  }));

  if (words.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 p-6 py-16 text-center">
        <h1 className="text-xl font-semibold">No words to practice here</h1>
        <p className="text-sm text-muted-foreground">Try a different scope, or add more words first.</p>
        <a href="/flashcards" className="text-sm font-medium underline">
          Back to flashcards
        </a>
      </div>
    );
  }

  const mode = (params.mode as FlashcardMode | "mixed" | undefined) ?? "mixed";

  return (
    <div className="p-6">
      <FlashcardSession words={words} requestedMode={mode} scopeLabel={SCOPE_LABEL[scope] ?? "Practice"} />
    </div>
  );
}
