/**
 * Returns today's date as YYYY-MM-DD in the given IANA timezone — this is
 * the calendar date used for daily_entries, streaks, etc. so "today"
 * matches the learner's actual day, not the server's UTC day.
 *
 * en-CA locale formats as YYYY-MM-DD, which happens to be exactly what
 * Postgres `date` columns and drizzle expect as input.
 */
export function todayInTimezone(timezone: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(at);
  } catch {
    // Invalid/unknown timezone string — fall back to UTC rather than throw.
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(at);
  }
}

/** The Monday (YYYY-MM-DD) of the ISO week containing the given YYYY-MM-DD date. */
export function weekStartFor(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return date.toISOString().slice(0, 10);
}

/** The calendar day immediately before a YYYY-MM-DD string, as YYYY-MM-DD. */
export function previousDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD string by `days` (negative = earlier), as YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

