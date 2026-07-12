import type { ResumeData } from "@/lib/types/resume";
import { ResumeShell } from "./resume-sections";

/**
 * Modern — a touch of color with a confident rhythm. Dates right-align
 * on the same line as role/company, and a thin accent rule sits under
 * the header to match the underlined section headings.
 */
export function ModernTemplate({ data }: { data: ResumeData }) {
  return <ResumeShell data={data} justifyDates headerRule />;
}
