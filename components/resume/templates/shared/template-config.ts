import type { TemplateId } from "@/lib/types/resume";

export interface TemplateConfig {
  id: TemplateId;
  label: string;
  description: string;
  fontSizePt: { name: number; heading: number; body: number; meta: number };
  spacingPt: { sectionGap: number; itemGap: number; lineGap: number };
  headingStyle: "uppercase" | "bold" | "underline-rule";
  showAccentRule: boolean;
}

export const templateConfigs: Record<TemplateId, TemplateConfig> = {
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Clean and understated, all business.",
    fontSizePt: { name: 20, heading: 11, body: 10.5, meta: 9.5 },
    spacingPt: { sectionGap: 14, itemGap: 8, lineGap: 3 },
    headingStyle: "uppercase",
    showAccentRule: false,
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "A touch of color with a confident rhythm.",
    fontSizePt: { name: 22, heading: 11.5, body: 11, meta: 9.5 },
    spacingPt: { sectionGap: 16, itemGap: 9, lineGap: 3 },
    headingStyle: "underline-rule",
    showAccentRule: true,
  },
  compact: {
    id: "compact",
    label: "Compact",
    description: "Tight spacing to fit more on one page.",
    fontSizePt: { name: 18, heading: 10.5, body: 10, meta: 9 },
    spacingPt: { sectionGap: 10, itemGap: 6, lineGap: 2 },
    headingStyle: "bold",
    showAccentRule: false,
  },
  executive: {
    id: "executive",
    label: "Executive",
    description: "Generous whitespace for senior roles.",
    fontSizePt: { name: 24, heading: 12, body: 11.5, meta: 10 },
    spacingPt: { sectionGap: 18, itemGap: 10, lineGap: 4 },
    headingStyle: "uppercase",
    showAccentRule: true,
  },
  europass: {
    id: "europass",
    label: "Europass",
    description: "The standard European CV format, CEFR language grid included.",
    fontSizePt: { name: 18, heading: 11, body: 10, meta: 9 },
    spacingPt: { sectionGap: 14, itemGap: 8, lineGap: 3 },
    headingStyle: "uppercase",
    showAccentRule: true,
  },
};

export const templateOrder: TemplateId[] = ["minimal", "modern", "compact", "executive", "europass"];
