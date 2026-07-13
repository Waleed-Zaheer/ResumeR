"use client";

import { CloudUpload, Eye, FileDown, LayoutTemplate, Palette, ShieldCheck, type LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useScrollReveal } from "@/components/landing/animations/use-scroll-reveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "ATS-safe templates",
    description:
      "Every layout parses cleanly in applicant tracking systems — no tables, columns, or graphics that trip up a parser.",
  },
  {
    icon: Eye,
    title: "Live preview",
    description:
      "Watch your resume update instantly as you type, so you always know exactly what a recruiter will see.",
  },
  {
    icon: FileDown,
    title: "Instant PDF & DOCX export",
    description: "Download a pixel-perfect PDF or an editable DOCX in one click, whenever you need to apply.",
  },
  {
    icon: CloudUpload,
    title: "Autosave, always in sync",
    description:
      "Every change is saved to your account automatically, so you can pick up right where you left off on any device.",
  },
  {
    icon: LayoutTemplate,
    title: "4 ATS-safe templates",
    description: "Minimal, Modern, Compact, and Executive — switch anytime without losing your content.",
  },
  {
    icon: Palette,
    title: "Accent colors & page size",
    description: "Fine-tune each template's accent color and switch between Letter and A4 in one click.",
  },
];

export function Features() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Everything you need to land the interview
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            ResumeForge handles the formatting and the busywork, so you can focus on the story.
          </p>
        </div>

        <div ref={ref} className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} data-reveal>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/15">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
