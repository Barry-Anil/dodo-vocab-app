import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import {
  findWordById,
  getUserWord,
  getWordCategories,
  listUserCollections,
  getWordCollectionMembership,
} from "@/lib/db/queries/words";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WordActions } from "@/components/vocabulary/word-actions";
import { SentencePractice } from "@/components/vocabulary/sentence-practice";
import { WordNotes } from "@/components/vocabulary/word-notes";
import { AddToCollection } from "@/components/vocabulary/add-to-collection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const word = await findWordById(id);
  return { title: word ? `${word.text} – Vocabulary Builder` : "Word – Vocabulary Builder" };
}

function BadgeList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">None noted.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export default async function VocabularyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const word = await findWordById(id);
  if (!word) notFound();

  const userWord = await getUserWord(user.id, word.id);
  if (!userWord) redirect("/vocabulary");

  const [wordCategories, userCollections, collectionMembership] = await Promise.all([
    getWordCategories(user.id, word.id),
    listUserCollections(user.id),
    getWordCollectionMembership(user.id, word.id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight capitalize">{word.text}</h1>
          {word.ipa ? <span className="text-muted-foreground">/{word.ipa.replace(/\//g, "")}/</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {word.partOfSpeech ? <Badge variant="secondary">{word.partOfSpeech}</Badge> : null}
          {word.cefrLevel ? <Badge variant="outline">{word.cefrLevel}</Badge> : null}
          {wordCategories.map((c) => (
            <Badge key={c.id} variant="outline">
              {c.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <WordActions
          userWordId={userWord.id}
          wordText={word.text}
          isFavorite={userWord.isFavorite}
          status={userWord.status}
        />
        <AddToCollection
          wordId={word.id}
          collections={userCollections.map((c) => ({ id: c.id, name: c.name }))}
          memberOf={[...collectionMembership]}
        />
      </div>

      {!word.aiGeneratedAt ? (
        <p className="text-sm text-muted-foreground">Generating details for this word…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meaning</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p>{word.definition}</p>
              {word.simpleExplanation ? (
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">In simple terms</p>
                  <p className="text-sm">{word.simpleExplanation}</p>
                </div>
              ) : null}
              {word.practicalExplanation ? (
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">In practice</p>
                  <p className="text-sm">{word.practicalExplanation}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {word.examples.map((example, i) => (
                  <li key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm italic">
                    &ldquo;{example}&rdquo;
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Synonyms</CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeList items={word.synonyms} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Antonyms</CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeList items={word.antonyms} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Collocations</CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeList items={word.collocations} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Word family</CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeList items={word.wordFamily} />
              </CardContent>
            </Card>
          </div>

          {word.usageNotes || word.commonMistakes ? (
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                {word.usageNotes ? (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Usage notes</p>
                    <p className="text-sm">{word.usageNotes}</p>
                  </div>
                ) : null}
                {word.commonMistakes ? (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Common mistakes
                      </p>
                      <p className="text-sm">{word.commonMistakes}</p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Write your own sentence</CardTitle>
        </CardHeader>
        <CardContent>
          <SentencePractice word={word.text} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your notes</CardTitle>
        </CardHeader>
        <CardContent>
          <WordNotes userWordId={userWord.id} initialNotes={userWord.notes ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
