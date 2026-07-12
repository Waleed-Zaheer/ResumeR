import { format, parse } from "date-fns";
import type { ExperienceItem } from "@/lib/types/resume";

function parseYearMonth(value: string): Date | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  return parse(value, "yyyy-MM", new Date());
}

export function formatMonthYear(value: string | undefined): string {
  if (!value) return "";
  const date = parseYearMonth(value);
  if (!date) return value;
  return format(date, "MMM yyyy");
}

export function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  current: boolean | undefined
): string {
  const start = formatMonthYear(startDate);
  const end = current ? "Present" : formatMonthYear(endDate);
  if (!start && !end) return "";
  if (!end) return start;
  return `${start} - ${end}`;
}

export function sortExperienceDesc<T extends { startDate: string; current: boolean }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    return b.startDate.localeCompare(a.startDate);
  });
}

export function toFileSlug(fullName: string): string {
  const slug = fullName
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "_");
  return slug || "Resume";
}

export function experienceSortKey(item: Pick<ExperienceItem, "startDate" | "current">) {
  return item.current ? "9999-99" : item.startDate;
}
