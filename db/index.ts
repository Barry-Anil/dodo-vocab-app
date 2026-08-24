import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

const sql = neon(env.DATABASE_URL);

/**
 * Drizzle client using Neon's HTTP driver — a good fit for serverless/edge
 * deployment (no persistent connection pool to manage). If the app is ever
 * self-hosted against a local/Docker Postgres instead of Neon, swap this
 * for `drizzle-orm/node-postgres` with a `pg.Pool`; nothing outside this
 * file needs to change.
 */
export const db = drizzle(sql, { schema });
