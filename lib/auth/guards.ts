import { requireUser, UnauthorizedError } from "./session";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Used by the (admin) route group and any admin-only Server Action/route. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

export { requireUser, UnauthorizedError };
