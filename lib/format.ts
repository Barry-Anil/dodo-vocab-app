/**
 * Human-friendly duration from a raw second count: "0m", "45m", "1h",
 * "2h 15m". Used across the Study Timer page and its charts so the phrasing
 * never drifts.
 */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Compact "M:SS" / "MM:SS" clock for a live countdown. */
export function formatClock(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
