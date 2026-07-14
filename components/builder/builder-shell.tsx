"use client";

import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "@/components/ui/sonner";
import {
  ArrowLeft,
  ArrowRight,
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AutosaveIndicator } from "@/components/builder/autosave-indicator";
import { PreviewPanel } from "@/components/builder/preview-panel";
import { StepTemplate } from "@/components/builder/steps/step-template";
import { StepPersonalInfo } from "@/components/builder/steps/step-personal-info";
import { StepSummary } from "@/components/builder/steps/step-summary";
import { StepExperience } from "@/components/builder/steps/step-experience";
import { StepEducation } from "@/components/builder/steps/step-education";
import { StepSkills } from "@/components/builder/steps/step-skills";
import { StepProjects } from "@/components/builder/steps/step-projects";
import { StepCertificationsLanguages } from "@/components/builder/steps/step-certifications-languages";

interface StepDef {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  Component: ComponentType;
  isComplete: (data: ResumeData) => boolean;
}

const STEPS: StepDef[] = [
  { label: "Template & Design", shortLabel: "Template", icon: Palette, Component: StepTemplate, isComplete: () => true },
  {
    label: "Personal Info",
    shortLabel: "Info",
    icon: User,
    Component: StepPersonalInfo,
    isComplete: (d) => Boolean(d.personalInfo.fullName && d.personalInfo.email),
  },
  { label: "Summary", shortLabel: "Summary", icon: FileText, Component: StepSummary, isComplete: (d) => d.summary.trim().length > 0 },
  { label: "Experience", shortLabel: "Experience", icon: Briefcase, Component: StepExperience, isComplete: (d) => d.experience.length > 0 },
  { label: "Education", shortLabel: "Education", icon: GraduationCap, Component: StepEducation, isComplete: (d) => d.education.length > 0 },
  { label: "Skills", shortLabel: "Skills", icon: Sparkles, Component: StepSkills, isComplete: (d) => d.skills.length > 0 },
  { label: "Projects", shortLabel: "Projects", icon: FolderKanban, Component: StepProjects, isComplete: (d) => d.projects.length > 0 },
  {
    label: "Certifications & Languages",
    shortLabel: "Certs",
    icon: Award,
    Component: StepCertificationsLanguages,
    isComplete: (d) => d.certifications.length > 0 || d.languages.length > 0,
  },
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
  const isLastStep = step === STEPS.length - 1;

  return (
    <SidebarProvider className="min-h-0 flex-1" style={{ "--sidebar-width": "17rem" } as React.CSSProperties}>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="gap-2 border-b border-border">
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
            <div className="mt-1.5">
              <AutosaveIndicator resumeId={resumeId} />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {STEPS.map((s, i) => {
                  const complete = s.isComplete(data);
                  return (
                    <SidebarMenuItem key={s.label}>
                      <SidebarMenuButton
                        isActive={i === step}
                        tooltip={s.label}
                        onClick={() => setStep(i)}
                      >
                        <s.icon />
                        <span>{s.label}</span>
                      </SidebarMenuButton>
                      {complete && i !== step && (
                        <SidebarMenuBadge>
                          <Check className="size-3.5 text-primary" />
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-2 border-t border-border">
          <a href={`/api/resumes/${resumeId}/export/pdf`} download className="block">
            <Button type="button" variant="outline" size="sm" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
              <FileDown />
              <span className="group-data-[collapsible=icon]:hidden">Download PDF</span>
            </Button>
          </a>
          <a href={`/api/resumes/${resumeId}/export/docx`} download className="block">
            <Button type="button" variant="outline" size="sm" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
              <FileDown />
              <span className="group-data-[collapsible=icon]:hidden">Download DOCX</span>
            </Button>
          </a>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-0">
        {/* Mobile header */}
        <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2.5 lg:hidden">
          <SidebarTrigger />
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h1>
          <AutosaveIndicator resumeId={resumeId} />
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
              "flex min-h-0 flex-col",
              mobileView === "form" ? "flex" : "hidden lg:flex"
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-10">
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
            <div className="flex shrink-0 items-center justify-between border-t border-border bg-background px-6 py-4 lg:px-10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft />
                Back
              </Button>
              <p className="text-xs text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </p>
              {isLastStep ? (
                <a href={`/api/resumes/${resumeId}/export/pdf`} download>
                  <Button type="button">
                    Finish & Download
                    <FileDown />
                  </Button>
                </a>
              ) : (
                <Button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                  Next
                  <ArrowRight />
                </Button>
              )}
            </div>
          </div>
          <div
            className={cn(
              "min-h-0 border-t border-border bg-linear-to-b from-muted/50 to-muted/10 lg:border-t-0 lg:border-l",
              mobileView === "preview" ? "block" : "hidden lg:block"
            )}
          >
            <PreviewPanel className="h-full" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
