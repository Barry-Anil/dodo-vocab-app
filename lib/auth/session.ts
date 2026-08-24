import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Server-side session lookup for Server Components/Actions/Route Handlers.
 * Returns null if there's no session — use `requireUser()` when the caller
 * should fail instead of branching.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Defense-in-depth: middleware.ts is the first gate, but every Server
 * Action and Route Handler that touches user-owned data must call this too
 * (or getCurrentUser + its own check) and scope every query by the
 * returned `id` — never trust a client-supplied userId.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
