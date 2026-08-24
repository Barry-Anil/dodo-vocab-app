/**
 * Seeds the 15 default vocabulary categories (spec §12). Idempotent — safe
 * to re-run; existing rows are left untouched via ON CONFLICT DO NOTHING
 * against the (slug, userId) unique index (userId is null for defaults).
 *
 * Run with: npx tsx db/seed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const DEFAULT_CATEGORIES: Array<{ name: string; slug: string; icon: string; description: string }> = [
  { name: "Daily Life", slug: "daily-life", icon: "Coffee", description: "Everyday words for everyday situations." },
  { name: "Business", slug: "business", icon: "Briefcase", description: "Vocabulary for meetings, strategy, and the workplace." },
  { name: "Technology", slug: "technology", icon: "Cpu", description: "Words from software, hardware, and the digital world." },
  { name: "Education", slug: "education", icon: "GraduationCap", description: "School, learning, and classroom vocabulary." },
  { name: "Academic", slug: "academic", icon: "BookOpen", description: "Formal, research, and essay-writing vocabulary." },
  { name: "Travel", slug: "travel", icon: "Plane", description: "Words for airports, trips, and exploring new places." },
  { name: "Finance", slug: "finance", icon: "Landmark", description: "Money, banking, and investing vocabulary." },
  { name: "Law", slug: "law", icon: "Scale", description: "Legal and courtroom vocabulary." },
  { name: "Medicine", slug: "medicine", icon: "Stethoscope", description: "Health, medical, and clinical vocabulary." },
  { name: "Workplace", slug: "workplace", icon: "Building2", description: "Office culture and professional communication." },
  { name: "Relationships", slug: "relationships", icon: "Heart", description: "Words for family, friends, and connection." },
  { name: "Emotions", slug: "emotions", icon: "Smile", description: "Vocabulary for feelings and emotional states." },
  { name: "Slang", slug: "slang", icon: "MessageCircle", description: "Informal, everyday spoken expressions." },
  { name: "Idioms", slug: "idioms", icon: "Quote", description: "Common figurative expressions and sayings." },
  { name: "Phrasal Verbs", slug: "phrasal-verbs", icon: "Puzzle", description: "Verb + preposition/particle combinations." },
];

async function main() {
  // Dynamic imports, not static ones: static `import` declarations are
  // hoisted and evaluated before any of this file's own top-level code runs
  // (including the config() call above), so a static `import { db } from
  // "./index"` would load lib/env.ts — which validates process.env — *before*
  // .env.local had been read, always failing with "DATABASE_URL: undefined"
  // regardless of what's actually in the file. Dynamic imports run in
  // normal statement order, so they only resolve after config() has run.
  // (They're awaited here inside main(), not at the top level, since this
  // file is transformed as CommonJS and top-level await isn't valid there.)
  const [{ db }, { categories }, { sql }] = await Promise.all([
    import("./index"),
    import("./schema"),
    import("drizzle-orm"),
  ]);

  console.log(`Seeding ${DEFAULT_CATEGORIES.length} default categories...`);

  for (const category of DEFAULT_CATEGORIES) {
    // Targets the partial unique index on slug WHERE user_id IS NULL
    // (see db/schema/words.ts) — the plain (slug, userId) pair can't be
    // used as a conflict target here since Postgres never considers two
    // NULLs equal for uniqueness purposes.
    await db
      .insert(categories)
      .values({ ...category, isDefault: true, userId: null })
      .onConflictDoNothing({
        target: [categories.slug],
        where: sql`${categories.userId} IS NULL`,
      });
  }

  const count = await db.select({ count: sql<number>`count(*)` }).from(categories);
  console.log(`Done. ${count[0]?.count ?? "?"} categories now in the database.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
