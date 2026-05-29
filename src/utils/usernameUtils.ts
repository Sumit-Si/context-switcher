import User from "../models/user.model";

/**
 * Converts any string into a URL-safe username slug.
 * "Sumit Singh" → "sumitsingh"
 * "João Mendes" → "joaomendes"
 */
const slugify = (name: string): string =>
  name
    .normalize("NFD") // decompose accented chars: ã → a + combining
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // keep only alphanumeric
    .slice(0, 20) || // cap base length
  "user"; // fallback if everything stripped

/**
 * Generates a username that is guaranteed unique in the DB.
 *
 * Strategy:
 *   1. Try the clean slug ("sumitsingh")
 *   2. Try slug + 4-digit random suffix ("sumitsingh4821")
 *   3. Retry up to MAX_ATTEMPTS with fresh random suffixes
 *   4. Final fallback: slug + full timestamp (virtually guaranteed unique)
 *
 * This is O(1) in the happy path (most users get the slug or slug+4digits).
 */
export const generateUniqueUsername = async (
  displayName: string,
): Promise<string> => {
  const MAX_ATTEMPTS = 5;
  const base = slugify(displayName);

  // Attempt 1: try the clean base slug
  const baseExists = await User.exists({ username: base });
  if (!baseExists) return base;

  // Attempts 2–N: slug + random 4-digit suffix
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 1000–9999
    const candidate = `${base}${suffix}`;
    const exists = await User.exists({ username: candidate });
    if (!exists) return candidate;
  }

  // Final fallback: slug + timestamp (e.g. "sumitsingh1718023445123")
  // Collision probability is effectively zero
  return `${base}${Date.now()}`;
};

export const isMongoUniqueViolation = (
  error: unknown,
  field?: string,
): boolean => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  ) {
    if (!field) return true;
    const keyPattern = (error as { keyPattern?: Record<string, unknown> })
      .keyPattern;
    return keyPattern ? field in keyPattern : false;
  }
  return false;
};
