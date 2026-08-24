import argon2 from "argon2";

/**
 * argon2id password hashing. Chosen over bcrypt for stronger modern
 * defaults; if a future deploy target lacks native-binding support, this
 * is the single file to swap for a bcrypt-based implementation — nothing
 * else in the app touches password hashes directly.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    // Malformed/foreign hash format — treat as a failed verification rather
    // than throwing, so a bad hash never becomes an unhandled 500.
    return false;
  }
}
