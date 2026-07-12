import type { ResumeData } from "@/lib/types/resume";
import { ResumeShell } from "./resume-sections";

/**
 * Executive — generous whitespace for senior roles. Centered header,
 * right-aligned dates on the same line as role/company.
 */
export function ExecutiveTemplate({ data }: { data: ResumeData }) {
  return <ResumeShell data={data} justifyDates centerHeader />;
}
