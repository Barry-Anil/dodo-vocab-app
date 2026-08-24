"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { collections, collectionWords } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { createCollectionSchema } from "@/lib/validation/collections";
import type { ActionResult } from "./auth";

export type CreateCollectionResult = { success: true; id: string } | { success: false; error: string };

export async function createCollection(input: unknown): Promise<CreateCollectionResult> {
  const user = await requireUser();
  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [existing] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, user.id), eq(collections.name, parsed.data.name)))
    .limit(1);
  if (existing) return { success: false, error: "You already have a collection with this name." };

  const [row] = await db
    .insert(collections)
    .values({ userId: user.id, name: parsed.data.name, description: parsed.data.description })
    .returning({ id: collections.id });

  revalidatePath("/collections");
  return { success: true, id: row.id };
}

export async function deleteCollection(collectionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await db
    .delete(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, user.id)))
    .returning({ id: collections.id });

  if (result.length === 0) return { success: false, error: "Collection not found." };
  revalidatePath("/collections");
  return { success: true };
}

export async function addWordToCollection(collectionId: string, wordId: string): Promise<ActionResult> {
  const user = await requireUser();

  const [owned] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, user.id)))
    .limit(1);
  if (!owned) return { success: false, error: "Collection not found." };

  await db.insert(collectionWords).values({ collectionId, wordId }).onConflictDoNothing({
    target: [collectionWords.collectionId, collectionWords.wordId],
  });

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/vocabulary/${wordId}`);
  return { success: true };
}

export async function removeWordFromCollection(collectionId: string, wordId: string): Promise<ActionResult> {
  const user = await requireUser();

  const [owned] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, user.id)))
    .limit(1);
  if (!owned) return { success: false, error: "Collection not found." };

  await db
    .delete(collectionWords)
    .where(and(eq(collectionWords.collectionId, collectionId), eq(collectionWords.wordId, wordId)));

  revalidatePath(`/collections/${collectionId}`);
  return { success: true };
}
