import type { ResumeData } from "@/lib/types/resume";
import { ResumeDocument } from "./resume-document";

export function ExecutivePdfDocument({ data }: { data: ResumeData }) {
  return <ResumeDocument data={data} justifyDates centerHeader />;
}
