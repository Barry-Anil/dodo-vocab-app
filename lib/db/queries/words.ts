import { and, desc, eq, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { words, userWords, wordCategories, categories, collectionWords, collections } from "@/db/schema";
import type { WordStatus } from "@/db/schema";

function normalizeWordText(text: string): string {
  return text.trim().toLowerCase();
}

export { normalizeWordText };

export async function findWordByNormalizedText(textNormalized: string) {
  const [row] = await db.select().from(words).where(eq(words.textNormalized, textNormalized)).limit(1);
  return row ?? null;
}

export async function findWordById(wordId: string) {
  const [row] = await db.select().from(words).where(eq(words.id, wordId)).limit(1);
  return row ?? null;
}

export async function getUserWord(userId: string, wordId: string) {
  const [row] = await db
    .select()
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.wordId, wordId)))
    .limit(1);
  return row ?? null;
}

export async function getUserWordById(userId: string, userWordId: string) {
  const [row] = await db
    .select()
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.id, userWordId)))
    .limit(1);
  return row ?? null;
}

export interface WordBankFilters {
  search?: string;
  categorySlug?: string;
  status?: WordStatus;
  favoritesOnly?: boolean;
  dueOnly?: boolean;
  weakOnly?: boolean;
}

/**
 * The word bank list query — joins the per-user progress row with its
 * canonical word, optionally scoped by search/category/status/favorite/due.
 * Categories are resolved separately per word (word_categories is scoped by
 * userId too, so a single join keeps this simple at this data volume).
 */
export async function listUserWords(userId: string, filters: WordBankFilters = {}) {
  const conditions = [eq(userWords.userId, userId)];

  if (filters.status) conditions.push(eq(userWords.status, filters.status));
  if (filters.favoritesOnly) conditions.push(eq(userWords.isFavorite, true));
  if (filters.dueOnly) conditions.push(lte(userWords.nextReviewAt, new Date()));
  if (filters.weakOnly) conditions.push(eq(userWords.isWeak, true));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(words.text, term), ilike(words.definition, term), ilike(words.usageNotes, term))!,
    );
  }

  let wordIdsForCategory: string[] | null = null;
  if (filters.categorySlug) {
    const rows = await db
      .select({ wordId: wordCategories.wordId })
      .from(wordCategories)
      .innerJoin(categories, eq(wordCategories.categoryId, categories.id))
      .where(and(eq(wordCategories.userId, userId), eq(categories.slug, filters.categorySlug)));
    wordIdsForCategory = rows.map((r) => r.wordId);
    if (wordIdsForCategory.length === 0) return [];
    conditions.push(inArray(userWords.wordId, wordIdsForCategory));
  }

  return db
    .select({ userWord: userWords, word: words })
    .from(userWords)
    .innerJoin(words, eq(userWords.wordId, words.id))
    .where(and(...conditions))
    .orderBy(desc(userWords.createdAt));
}

export async function getWordCategories(userId: string, wordId: string) {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, icon: categories.icon })
    .from(wordCategories)
    .innerJoin(categories, eq(wordCategories.categoryId, categories.id))
    .where(and(eq(wordCategories.userId, userId), eq(wordCategories.wordId, wordId)));
}

export async function listAllCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(or(eq(categories.isDefault, true), eq(categories.userId, userId)))
    .orderBy(categories.isDefault, categories.name);
}

export async function getWordBankStats(userId: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      mastered: sql<number>`count(*) filter (where ${userWords.status} = 'MASTERED')`,
      needsReview: sql<number>`count(*) filter (where ${userWords.nextReviewAt} <= now())`,
      weak: sql<number>`count(*) filter (where ${userWords.isWeak} = true)`,
    })
    .from(userWords)
    .where(eq(userWords.userId, userId));

  return {
    total: Number(row?.total ?? 0),
    mastered: Number(row?.mastered ?? 0),
    needsReview: Number(row?.needsReview ?? 0),
    weak: Number(row?.weak ?? 0),
  };
}

export async function listUserCollections(userId: string) {
  return db.select().from(collections).where(eq(collections.userId, userId)).orderBy(collections.name);
}

export async function listUserCollectionsWithCounts(userId: string) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      description: collections.description,
      color: collections.color,
      createdAt: collections.createdAt,
      wordCount: sql<number>`count(${collectionWords.wordId})`,
    })
    .from(collections)
    .leftJoin(collectionWords, eq(collectionWords.collectionId, collections.id))
    .where(eq(collections.userId, userId))
    .groupBy(collections.id)
    .orderBy(collections.name);
}

/** Which of the user's collections already contain this word — for the word detail page's picker. */
export async function getWordCollectionMembership(userId: string, wordId: string) {
  const rows = await db
    .select({ collectionId: collectionWords.collectionId })
    .from(collectionWords)
    .innerJoin(collections, eq(collectionWords.collectionId, collections.id))
    .where(and(eq(collections.userId, userId), eq(collectionWords.wordId, wordId)));
  return new Set(rows.map((r) => r.collectionId));
}

export async function getCollectionWithWords(userId: string, collectionId: string) {
  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1);
  if (!collection) return null;

  const items = await db
    .select({ word: words, userWord: userWords })
    .from(collectionWords)
    .innerJoin(words, eq(collectionWords.wordId, words.id))
    .innerJoin(userWords, and(eq(userWords.wordId, words.id), eq(userWords.userId, userId)))
    .where(eq(collectionWords.collectionId, collectionId));

  return { collection, items };
}
