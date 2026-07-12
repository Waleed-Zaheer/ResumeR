import type { ComponentType } from "react";
import type { ResumeData, TemplateId } from "@/lib/types/resume";
import { templateConfigs } from "./shared/template-config";
import { MinimalTemplate } from "./dom/minimal";
import { ModernTemplate } from "./dom/modern";
import { CompactTemplate } from "./dom/compact";
import { ExecutiveTemplate } from "./dom/executive";
import { MinimalPdfDocument } from "./pdf/minimal";
import { ModernPdfDocument } from "./pdf/modern";
import { CompactPdfDocument } from "./pdf/compact";
import { ExecutivePdfDocument } from "./pdf/executive";

type TemplateComponent = ComponentType<{ data: ResumeData }>;

export interface TemplateRegistryEntry {
  id: TemplateId;
  label: string;
  description: string;
  Dom: TemplateComponent;
  Pdf: TemplateComponent;
}

export const templateRegistry: Record<TemplateId, TemplateRegistryEntry> = {
  minimal: {
    id: "minimal",
    label: templateConfigs.minimal.label,
    description: templateConfigs.minimal.description,
    Dom: MinimalTemplate,
    Pdf: MinimalPdfDocument,
  },
  modern: {
    id: "modern",
    label: templateConfigs.modern.label,
    description: templateConfigs.modern.description,
    Dom: ModernTemplate,
    Pdf: ModernPdfDocument,
  },
  compact: {
    id: "compact",
    label: templateConfigs.compact.label,
    description: templateConfigs.compact.description,
    Dom: CompactTemplate,
    Pdf: CompactPdfDocument,
  },
  executive: {
    id: "executive",
    label: templateConfigs.executive.label,
    description: templateConfigs.executive.description,
    Dom: ExecutiveTemplate,
    Pdf: ExecutivePdfDocument,
  },
};
