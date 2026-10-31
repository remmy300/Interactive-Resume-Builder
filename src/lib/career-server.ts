/** Parses a date input value coming from the client; empty means "not set". */
export function parseOptionalDate(value?: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value.trim()) return null;
  // Date-only inputs are interpreted at noon local time so the calendar day does
  // not shift backwards for users west of UTC.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T12:00:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
