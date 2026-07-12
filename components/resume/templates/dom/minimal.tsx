import type { ResumeData } from "@/lib/types/resume";
import { ResumeShell } from "./resume-sections";

/**
 * Minimal — the plainest baseline. Left-aligned header, stacked
 * role/company with dates on the meta line below, no accent rule.
 */
export function MinimalTemplate({ data }: { data: ResumeData }) {
  return <ResumeShell data={data} justifyDates={false} />;
}
