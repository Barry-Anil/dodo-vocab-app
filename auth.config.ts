import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible slice of the NextAuth config — used by middleware.ts.
 * No database or argon2 imports here (those are Node-only); the actual
 * Credentials provider with its `authorize()` lives in auth.ts, which
 * spreads this config in.
 */
// `satisfies` (not `: NextAuthConfig`) preserves the literal type of
// `session.strategy: "jwt"` — annotating with the interface directly would
// widen it to `"jwt" | "database"`, which loses the conditional typing that
// makes `token` well-typed (vs `unknown`) in the `session` callback below.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      const isAdminRoute = pathname.startsWith("/admin");
      const isProtectedRoute =
        isAdminRoute ||
        [
          "/dashboard",
          "/calendar",
          "/vocabulary",
          "/review",
          "/flashcards",
          "/quiz",
          "/progress",
          "/collections",
          "/settings",
          "/onboarding",
        ].some((route) => pathname === route || pathname.startsWith(`${route}/`));

      if (isAdminRoute) {
        return isLoggedIn && auth?.user.role === "admin";
      }
      if (isProtectedRoute) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // populated in auth.ts
} satisfies NextAuthConfig;
