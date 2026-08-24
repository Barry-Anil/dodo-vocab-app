# Vocabulary Builder

An AI-assisted vocabulary learning app: add words, get structured AI-generated
details, review with spaced repetition, and take AI-generated weekly quizzes.

This project is a **self-contained subtree** — it lives inside a larger git
repository (`D:\dodos_world`) that also contains an unrelated Vite/React 3D
globe app at the repo root. Nothing here depends on, imports, or modifies
anything outside this `dodo_vocab_app/` folder; it has its own `package.json`,
lockfile, `node_modules`, and `tsconfig.json`.

This README currently documents **Phase 1** of a 12-phase build (see
[Roadmap](#roadmap) below). Phase 1 delivers the project skeleton, the full
database schema, the `AIService` abstraction, and NextAuth v5 wiring — routes
exist and are auth-gated, but most pages are placeholders until their phase.

## Stack

Next.js (App Router) · TypeScript · React · Tailwind CSS · shadcn/ui ·
Drizzle ORM · PostgreSQL (Neon) · NextAuth v5 (Credentials + JWT) · Zod ·
Groq / Anthropic Claude (swappable AI provider)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Neon Postgres database

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string (starts with `postgresql://...`).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon connection string from step 2. |
| `AUTH_SECRET` | Yes | Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Yes | `http://localhost:3000` for local dev. |
| `AI_PROVIDER` | No | `groq` (default) or `anthropic` — which `AIService` implementation is active. Only that provider's API key is required. |
| `GROQ_API_KEY` | If `AI_PROVIDER=groq` | From [console.groq.com/keys](https://console.groq.com/keys). |
| `GROQ_DEFAULT_MODEL` / `GROQ_FAST_MODEL` | No | Default to `openai/gpt-oss-120b` / `openai/gpt-oss-20b`. |
| `ANTHROPIC_API_KEY` | If `AI_PROVIDER=anthropic` | From [console.anthropic.com](https://console.anthropic.com). |
| `ANTHROPIC_DEFAULT_MODEL` / `ANTHROPIC_FAST_MODEL` | No | Default to a current Claude model / a cheaper Claude model. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | No | Unused in Phase 1 — reserved for the Phase 12 rate-limiter upgrade. |

`lib/env.ts` validates these at startup via Zod and fails fast with a clear
error if something required is missing.

### 4. Run database migrations

```bash
npx drizzle-kit generate   # only needed after changing db/schema/*.ts
npx drizzle-kit migrate    # applies db/migrations/*.sql to DATABASE_URL
```

`drizzle-kit generate` was already run for the Phase 1 schema — its output is
committed at `db/migrations/0000_*.sql`. Only re-run `generate` after editing
a schema file; run `migrate` to actually apply migrations to your database.

The generated migration (23 tables, 15 enum types, all indexes/constraints)
has been verified end-to-end against a real PostgreSQL 16 instance —
including the `search_vector` generated column + GIN index, the two partial
unique indexes on `categories` (see note below), and FK cascade-delete
behavior.

### 5. Seed default categories

```bash
npx tsx db/seed.ts
```

Seeds the 15 default vocabulary categories (Daily Life, Business, Technology,
Education, Academic, Travel, Finance, Law, Medicine, Workplace,
Relationships, Emotions, Slang, Idioms, Phrasal Verbs). Safe to re-run —
idempotent via a partial unique index on `categories.slug WHERE user_id IS
NULL` (a plain `(slug, userId)` unique index would **not** prevent duplicate
default-category rows, since Postgres never considers two `NULL`s equal for
uniqueness purposes — see `db/schema/words.ts`).

### 6. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`. Register an account at `/register` (this also
creates default `user_preferences` / `notification_preferences` /
`user_streaks` rows and signs you in), or sign in at `/login`. Visiting any
of the authenticated routes (`/dashboard`, `/vocabulary`, etc.) while signed
out redirects to `/login`; each currently renders a "coming in Phase N"
placeholder.

## Testing

```bash
npx tsc --noEmit   # type-check
npx eslint .       # lint
npm run build      # production build
```

There is no automated test suite yet — per spec, unit/integration tests for
streak calculation, review scheduling, mastery calculation, quiz scoring,
weak-word carry-over, and AI response validation are a Phase 12 deliverable,
once the logic they exercise (Phases 5–8) exists.

Manual verification checklist for Phase 1:

- [ ] `npm run dev` boots; `/`, `/login`, `/register` render.
- [ ] Registering a new account signs you in and lands on `/dashboard`.
- [ ] Visiting `/dashboard` while signed out redirects to `/login`.
- [ ] `GET /api/health` returns `{"status":"ok","db":"connected"}` once
      `DATABASE_URL` points at a real, migrated database.
- [ ] `POST /api/ai/word-details` with `{"word":"reluctant"}` (while signed
      in) returns structured word details once the active provider's API key
      (`GROQ_API_KEY` by default) is set.

## Project structure

```
app/
  (auth)/          login, register, forgot-password — public, unauthenticated
  (app)/           dashboard, calendar, vocabulary, review, flashcards,
                    quiz, progress, collections, settings — auth-gated shell
  (admin)/admin/   placeholder for the Phase 11 admin dashboard
  api/auth/        NextAuth route handler
  api/ai/          AI route handlers (word-details, extract, evaluate-sentence)
  api/health/      DB connectivity check
db/
  schema/          Drizzle table definitions, one file per domain area
  migrations/       generated SQL migrations (committed)
  seed.ts          seeds default categories
lib/
  auth/            session helpers, password hashing, role guards
  ai/              AIService interface, Groq/Anthropic providers, prompts, cache, rate-limit
  srs/             spaced-repetition algorithm (SM-2-like, swappable)
  validation/      shared Zod schemas
  actions/         Server Actions (register/login/logout/forgot-password)
  env.ts           validated environment variables
auth.ts / auth.config.ts / proxy.ts   NextAuth v5 config + route protection
```

See `db/schema/index.ts` for the full entity list and relations, and
`lib/ai/types.ts` for the `AIService` interface every AI feature is built
against.

## Roadmap

1. ✅ Architecture + database schema
2. ✅ Auth UI polish + onboarding flow (level/goals/daily target/reminders) + collapsible app shell
3. Dashboard + calendar
4. AI word generation end-to-end + word bank/search/categories
5. Flashcards + spaced-repetition wiring
6. Quick review + weekly quiz
7. Weak-word carry-over + adaptive quizzing
8. Notifications + streaks
9. Progress analytics + AI weekly report/coach
10. Paste-text extraction + global search UI
11. Admin dashboard
12. Production hardening (distributed rate limiting, accessibility/perf
    pass, automated test suite, error/empty/loading-state polish)
