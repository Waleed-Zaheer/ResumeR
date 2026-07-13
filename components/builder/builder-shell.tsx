"use client";

import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  Check,
  Eye,
  FileDown,
  FileText,
  FolderKanban,
  GraduationCap,
  Palette,
  Pencil,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
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

interface StepDef {
  label: string;
  icon: LucideIcon;
  Component: ComponentType;
  isComplete: (data: ResumeData) => boolean;
}

const STEPS: StepDef[] = [
  {
    label: "Personal Info",
    icon: User,
    Component: StepPersonalInfo,
    isComplete: (d) => Boolean(d.personalInfo.fullName && d.personalInfo.email),
  },
  { label: "Summary", icon: FileText, Component: StepSummary, isComplete: (d) => d.summary.trim().length > 0 },
  { label: "Experience", icon: Briefcase, Component: StepExperience, isComplete: (d) => d.experience.length > 0 },
  { label: "Education", icon: GraduationCap, Component: StepEducation, isComplete: (d) => d.education.length > 0 },
  { label: "Skills", icon: Sparkles, Component: StepSkills, isComplete: (d) => d.skills.length > 0 },
  { label: "Projects", icon: FolderKanban, Component: StepProjects, isComplete: (d) => d.projects.length > 0 },
  {
    label: "Certifications & Languages",
    icon: Award,
    Component: StepCertificationsLanguages,
    isComplete: (d) => d.certifications.length > 0 || d.languages.length > 0,
  },
  { label: "Template & Design", icon: Palette, Component: StepTemplate, isComplete: () => true },
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
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* Desktop icon rail */}
      <nav className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/20 lg:flex">
        <div className="border-b border-border p-4">
          <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
          <div className="mt-1.5">
            <AutosaveIndicator resumeId={resumeId} />
          </div>
        </div>

        <ol className="flex-1 space-y-1 p-3">
          {STEPS.map((s, i) => {
            const active = i === step;
            const complete = s.isComplete(data);
            return (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      active
                        ? "bg-primary-foreground/20"
                        : complete
                          ? "bg-primary/15 text-primary"
                          : "border border-border bg-background"
                    )}
                  >
                    {complete && !active ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="space-y-2 border-t border-border p-3">
          <a href={`/api/resumes/${resumeId}/export/pdf`} download className="block">
            <Button type="button" variant="outline" size="sm" className="w-full justify-start">
              <FileDown />
              Download PDF
            </Button>
          </a>
          <a href={`/api/resumes/${resumeId}/export/docx`} download className="block">
            <Button type="button" variant="outline" size="sm" className="w-full justify-start">
              <FileDown />
              Download DOCX
            </Button>
          </a>
        </div>
      </nav>

      {/* Mobile header */}
      <div className="border-b border-border bg-background px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
          <AutosaveIndicator resumeId={resumeId} />
        </div>
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                i === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              <s.icon className="size-3" />
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <a href={`/api/resumes/${resumeId}/export/pdf`} download className="flex-1">
            <Button type="button" variant="outline" size="sm" className="w-full">
              PDF
            </Button>
          </a>
          <a href={`/api/resumes/${resumeId}/export/docx`} download className="flex-1">
            <Button type="button" variant="outline" size="sm" className="w-full">
              DOCX
            </Button>
          </a>
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
            "min-h-0 overflow-y-auto p-6 lg:p-10",
            mobileView === "form" ? "block" : "hidden lg:block"
          )}
        >
          <div className="mx-auto max-w-xl">
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
        </div>
        <div
          className={cn(
            "min-h-0 border-t border-border bg-gradient-to-b from-muted/50 to-muted/10 lg:border-t-0 lg:border-l",
            mobileView === "preview" ? "block" : "hidden lg:block"
          )}
        >
          <PreviewPanel className="h-full" />
        </div>
      </div>
    </div>
  );
}
