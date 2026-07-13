import type { ResumeData } from "@/lib/types/resume";
import { ResumeDocument } from "./resume-document";

export function CompactPdfDocument({ data }: { data: ResumeData }) {
  return <ResumeDocument data={data} justifyDates={false} compactSkills />;
}
