import type { ResumeData } from "@/lib/types/resume";
import { ResumeDocument } from "./resume-document";

export function ModernPdfDocument({ data }: { data: ResumeData }) {
  return <ResumeDocument data={data} justifyDates headerRule />;
}
