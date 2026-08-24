import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { cefrLevelEnum, partOfSpeechEnum, wordSourceEnum } from "./enums";
import { users } from "./auth";
import { aiGenerations } from "./ai";

/** Postgres `tsvector` — no first-class Drizzle column type, so declared as a custom type. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Canonical, shared vocabulary. One row per unique word — never duplicated
 * per user. AI-generated content is cached here permanently; per-user
 * progress lives entirely in `user_words`.
 */
export const words = pgTable(
  "words",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    // lower(trim(text)) — the dedup/canonicalization key.
    textNormalized: text("text_normalized").notNull(),
    partOfSpeech: partOfSpeechEnum("part_of_speech"),
    pronunciation: text("pronunciation"),
    ipa: text("ipa"),
    cefrLevel: cefrLevelEnum("cefr_level"),
    definition: text("definition"),
    simpleExplanation: text("simple_explanation"),
    practicalExplanation: text("practical_explanation"),
    examples: jsonb("examples").$type<string[]>().notNull().default([]),
    synonyms: jsonb("synonyms").$type<string[]>().notNull().default([]),
    antonyms: jsonb("antonyms").$type<string[]>().notNull().default([]),
    collocations: jsonb("collocations").$type<string[]>().notNull().default([]),
    wordFamily: jsonb("word_family").$type<string[]>().notNull().default([]),
    usageNotes: text("usage_notes"),
    commonMistakes: text("common_mistakes"),
    // Optional supporting image — only populated when an image meaningfully
    // helps (spec §9); never forced.
    imageUrl: text("image_url"),
    imageGeneratedAt: timestamp("image_generated_at", { withTimezone: true }),
    // Null = this word still needs AI enrichment (e.g. a bare stub created
    // from paste-text extraction before the user selects it).
    aiGeneratedAt: timestamp("ai_generated_at", { withTimezone: true }),
    aiGenerationId: uuid("ai_generation_id").references(() => aiGenerations.id, {
      onDelete: "set null",
    }),
    sourceType: wordSourceEnum("source_type").notNull().default("ai"),
    // Full-text search across word/definition/usage notes (spec §41: search
    // by word/meaning/synonym/antonym/category/notes — categories are
    // joined separately at query time; synonym/antonym arrays are small
    // enough to filter in the query layer without needing them in the
    // vector). Built now rather than deferred so word bank search doesn't
    // need a later migration.
    // Column names are unqualified (sql.raw, not the words.* column
    // proxies) — Postgres generated-column expressions only accept bare
    // column identifiers, not table-qualified ones.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('english',
          coalesce(${sql.raw('"text"')}, '') || ' ' ||
          coalesce(${sql.raw('"definition"')}, '') || ' ' ||
          coalesce(${sql.raw('"usage_notes"')}, '')
        )`,
    ),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("words_text_normalized_unique").on(t.textNormalized),
    index("words_cefr_level_idx").on(t.cefrLevel),
    index("words_search_vector_idx").using("gin", t.searchVector),
  ],
);

/**
 * 15 default categories (spec §12) are seeded with `isDefault = true,
 * userId = null`. Custom categories a user creates have `userId` set.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    isDefault: boolean("is_default").notNull().default(false),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (t) => [
    // Postgres unique indexes treat NULL as distinct, so a plain unique on
    // (slug, userId) would NOT stop duplicate default categories (userId
    // IS NULL) from being inserted on every seed re-run — hence two partial
    // unique indexes instead of one: default categories unique by slug
    // alone, custom categories unique per (slug, userId).
    uniqueIndex("categories_default_slug_unique")
      .on(t.slug)
      .where(sql`${t.userId} IS NULL`),
    uniqueIndex("categories_user_slug_unique")
      .on(t.slug, t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
    index("categories_user_id_idx").on(t.userId),
  ],
);

/**
 * Many-to-many word <-> category. Deliberately scoped by `userId`: `words`
 * rows are shared/canonical, but tagging a word into a category is a
 * personal organizational act (spec: vocabulary is private per user) — the
 * same canonical word can be tagged "Business" by one user and "Travel" by
 * another without conflict.
 */
export const wordCategories = pgTable(
  "word_categories",
  {
    wordId: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.wordId, t.categoryId, t.userId] }),
    index("word_categories_category_id_idx").on(t.categoryId),
    index("word_categories_user_word_idx").on(t.userId, t.wordId),
  ],
);
