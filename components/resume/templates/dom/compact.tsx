import type { ResumeData } from "@/lib/types/resume";
import { ResumeShell } from "./resume-sections";

/**
 * Compact — tight spacing to fit more on one page. Stacked entries like
 * Minimal, plus skill groups condensed onto a single wrapped line to
 * save vertical space.
 */
export function CompactTemplate({ data }: { data: ResumeData }) {
  return <ResumeShell data={data} justifyDates={false} compactSkills />;
}
