"use client";

import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import { updateResumeAction } from "@/lib/actions/resume-actions";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import type { ResumeData } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AutosaveIndicator } from "@/components/builder/autosave-indicator";
import { PreviewPanel } from "@/components/builder/preview-panel";
import { StepPersonalInfo } from "@/components/builder/steps/step-personal-info";
import { StepSummary } from "@/components/builder/steps/step-summary";
import { StepExperience } from "@/components/builder/steps/step-experience";
import { StepEducation } from "@/components/builder/steps/step-education";
import { StepSkills } from "@/components/builder/steps/step-skills";
import { StepProjects } from "@/components/builder/steps/step-projects";
import { StepCertificationsLanguages } from "@/components/builder/steps/step-certifications-languages";
import { StepTemplate } from "@/components/builder/steps/step-template";

const STEPS: { label: string; Component: ComponentType }[] = [
  { label: "Personal Info", Component: StepPersonalInfo },
  { label: "Summary", Component: StepSummary },
  { label: "Experience", Component: StepExperience },
  { label: "Education", Component: StepEducation },
  { label: "Skills", Component: StepSkills },
  { label: "Projects", Component: StepProjects },
  { label: "Certifications & Languages", Component: StepCertificationsLanguages },
  { label: "Template & Design", Component: StepTemplate },
];

export function BuilderShell({ resumeId, title }: { resumeId: string; title: string }) {
  const [step, setStep] = useState(0);
  const [mobileView, setMobileView] = useState<"form" | "preview">("form");

  const data = useResumeStore((s) => s.data);
  const setSaveStatus = useResumeStore((s) => s.setSaveStatus);
  const [, startTransition] = useTransition();
  const isFirstRun = useRef(true);

  const debouncedSave = useDebouncedCallback((current: ResumeData) => {
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateResumeAction(resumeId, current);
      if (result.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        toast.error(result.error || "Failed to save resume");
      }
    });
  }, 800);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    debouncedSave(data);
  }, [data, debouncedSave]);

  const StepComponent = STEPS[step].Component;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <AutosaveIndicator resumeId={resumeId} />
            <div className="flex items-center gap-2">
              <a href={`/api/resumes/${resumeId}/export/pdf`} download>
                <Button type="button" variant="outline" size="sm">
                  Download PDF
                </Button>
              </a>
              <a href={`/api/resumes/${resumeId}/export/docx`} download>
                <Button type="button" variant="outline" size="sm">
                  Download DOCX
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                i === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-border py-2 lg:hidden">
        <Button
          type="button"
          size="sm"
          variant={mobileView === "form" ? "default" : "outline"}
          onClick={() => setMobileView("form")}
        >
          <Pencil />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mobileView === "preview" ? "default" : "outline"}
          onClick={() => setMobileView("preview")}
        >
          <Eye />
          Preview
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div
          className={cn(
            "min-h-0 overflow-y-auto p-4 lg:p-6",
            mobileView === "form" ? "block" : "hidden lg:block"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
        <div
          className={cn(
            "min-h-0 border-t border-border p-4 lg:border-t-0 lg:border-l lg:p-6",
            mobileView === "preview" ? "block" : "hidden lg:block"
          )}
        >
          <PreviewPanel className="h-full" />
        </div>
      </div>
    </div>
  );
}
