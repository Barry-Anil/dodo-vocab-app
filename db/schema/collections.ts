import { index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { users } from "./auth";
import { words } from "./words";

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("collections_user_id_idx").on(t.userId),
    uniqueIndex("collections_user_name_unique").on(t.userId, t.name),
  ],
);

/**
 * Ownership is implied via `collections.userId` — a word can belong to many
 * of the same user's collections (spec §25), no need to duplicate `userId`
 * here.
 */
export const collectionWords = pgTable(
  "collection_words",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.wordId] }),
    index("collection_words_word_id_idx").on(t.wordId),
  ],
);
