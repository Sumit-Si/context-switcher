/**
 * Converts a timezone offset in minutes to a MongoDB-compatible timezone string (±HH:mm).
 * Note: JS getTimezoneOffset() returns positive for West of UTC (e.g., +480 for PST)
 * and negative for East of UTC (e.g., -330 for IST).
 *
 * @param offset - Offset in minutes
 * @returns Formatted string, e.g., "+05:30" or "-08:00"
 */
export const formatTimezoneOffset = (offset: number): string => {
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;

  // JS getTimezoneOffset(): negative means ahead of UTC (East), positive means behind UTC (West)
  // MongoDB expects +HH:mm for ahead of UTC and -HH:mm for behind UTC
  const sign = offset <= 0 ? "+" : "-";

  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");

  return `${sign}${formattedHours}:${formattedMinutes}`;
};
