import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Primary route-protection gate for the (app) and (admin) route groups —
 * see auth.config.ts's `authorized` callback for the actual rules.
 *
 * (Next.js 16 renamed the "middleware" file convention to "proxy" — same
 * concept, same NextAuth wiring, new filename.)
 *
 * This is defense-in-depth's first layer, not the only layer: Server
 * Actions and Route Handlers additionally call requireUser()/requireAdmin()
 * (lib/auth/session.ts, lib/auth/guards.ts) because a proxy/middleware
 * layer alone can't express per-row data-ownership checks (e.g. "is this
 * user_word_id actually this user's?") — those happen in the query layer.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calendar/:path*",
    "/vocabulary/:path*",
    "/review/:path*",
    "/flashcards/:path*",
    "/quiz/:path*",
    "/progress/:path*",
    "/collections/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
};
