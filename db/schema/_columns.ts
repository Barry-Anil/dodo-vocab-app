import { timestamp } from "drizzle-orm/pg-core";

/**
 * Shared timestamp column pairs, reused across every table so the
 * created_at/updated_at convention (timestamptz, defaulting to now()) never
 * drifts between schema files.
 *
 * updated_at is maintained by application code on every mutating query, not
 * a DB trigger — simpler to reason about, and sufficient at this scale.
 */
export const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
