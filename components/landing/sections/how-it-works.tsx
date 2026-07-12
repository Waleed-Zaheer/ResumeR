"use client";

import { FileDown, LayoutTemplate, PenTool, type LucideIcon } from "lucide-react";
import { useScrollReveal } from "@/components/landing/animations/use-scroll-reveal";

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: PenTool,
    step: "01",
    title: "Fill in your info",
    description: "Add your experience, education, and skills with a guided, form-based editor.",
  },
  {
    icon: LayoutTemplate,
    step: "02",
    title: "Pick a template",
    description: "Switch between ATS-safe templates and accent colors without losing your content.",
  },
  {
    icon: FileDown,
    step: "03",
    title: "Export PDF or DOCX",
    description: "Download a polished file ready to attach to any application, instantly.",
  },
];

export function HowItWorks() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            From blank page to polished resume in minutes
          </h2>
        </div>

        <div ref={ref} className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} data-reveal className="relative rounded-xl border border-border bg-card p-6">
              <span className="text-sm font-semibold text-primary">{s.step}</span>
              <div className="mt-4 flex size-11 items-center justify-center rounded-lg bg-primary/15">
                <s.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-medium text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
