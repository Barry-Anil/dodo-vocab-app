import type { DefaultSession } from "next-auth";

export type UserRole = "user" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

// next-auth/jwt re-exports from @auth/core/jwt, but the `session` callback's
// param type in @auth/core's own type definitions is built directly against
// the @auth/core/jwt module — augmenting only "next-auth/jwt" above leaves
// that usage seeing the un-augmented (Record<string, unknown>-backed) JWT,
// so it's augmented here too for good measure.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
