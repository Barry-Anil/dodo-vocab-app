import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit runs outside Next.js, which is what normally loads .env.local
// automatically — load it explicitly here so `DATABASE_URL` is available to
// both `drizzle-kit generate/migrate` and db/seed.ts.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
