/**
 * ISO 8601 week utilities for AgroFair's weekly logistics cycle.
 * Monday-start weeks, EU standard.
 */

export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

export function getWeekDateRange(week: number, year: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}

export function getCurrentWeek(): { week: number; year: number } {
  const now = new Date();
  return { week: getISOWeekNumber(now), year: getISOWeekYear(now) };
}

export function formatWeekLabel(week: number, year: number): string {
  const { start, end } = getWeekDateRange(week, year);
  const endDisplay = new Date(end);
  endDisplay.setUTCDate(endDisplay.getUTCDate() - 1);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { month: "short", day: "numeric", timeZone: "UTC" });
  return `W${week} \u00B7 ${fmt(start)}\u2013${fmt(endDisplay)}, ${year}`;
}

export function parseWeekParams(
  params: Record<string, string | string[] | undefined>
): { week: number; year: number } {
  const current = getCurrentWeek();
  const w = typeof params.week === "string" ? parseInt(params.week, 10) : NaN;
  const y = typeof params.year === "string" ? parseInt(params.year, 10) : NaN;
  if (isNaN(w) || isNaN(y) || w < 1 || w > 53 || y < 2000 || y > 2100) {
    return current;
  }
  return { week: w, year: y };
}

export function getAdjacentWeek(
  week: number,
  year: number,
  direction: "prev" | "next"
): { week: number; year: number } {
  const { start } = getWeekDateRange(week, year);
  const target = new Date(start);
  target.setUTCDate(target.getUTCDate() + (direction === "next" ? 7 : -7));
  return { week: getISOWeekNumber(target), year: getISOWeekYear(target) };
}
