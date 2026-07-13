import Link from "next/link";
import { ArrowRight, Eye, FileDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollToButton } from "@/components/landing/scroll-to-button";
import { HeroVisual } from "@/components/landing/three/hero-visual";
import { ResumeMockup } from "@/components/landing/resume-mockup";

const quickFacts = [
  { icon: ShieldCheck, label: "ATS-safe templates" },
  { icon: Eye, label: "Live preview" },
  { icon: FileDown, label: "Instant PDF & DOCX" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient 3D atmosphere behind the content — not the focal point, just texture */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_65%_60%_at_75%_20%,black,transparent)]">
        <HeroVisual />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-primary),transparent)] opacity-20"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-24 md:py-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Built to pass ATS parsers
          </span>

          <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground md:text-7xl">
            Build an ATS-friendly resume that actually gets read
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            ResumeForge is the resume and CV builder with a live preview, ATS-safe
            templates, and instant PDF or DOCX export — so hiring software (and
            humans) see the best version of you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
              Get Started
              <ArrowRight />
            </Button>
            <ScrollToButton targetId="templates" size="lg" variant="outline">
              See templates
            </ScrollToButton>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-8">
            {quickFacts.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <ResumeMockup />
      </div>
    </section>
  );
}
