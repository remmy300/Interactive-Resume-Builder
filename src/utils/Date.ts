const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Formats a stored `YYYY-MM` (or legacy `YYYY-MM-DD`) value without going
 * through `Date`. Constructing a Date from a date-only string parses it as UTC
 * and can shift January into the previous year for users west of GMT.
 */
export function formatMonth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = /^(\d{4})-(\d{1,2})/.exec(trimmed);
  if (!match) return trimmed;

  const year = match[1];
  const month = Number(match[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return year;

  return `${MONTHS[month - 1]} ${year}`;
}

export function formatRange(
  startDate: string,
  endDate: string,
  current = false,
): string {
  const start = formatMonth(startDate);
  const end = current ? "Present" : formatMonth(endDate);

  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} – ${end}`;
}
