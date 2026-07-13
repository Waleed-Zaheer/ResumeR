"use client";

import { useScrollReveal } from "@/components/landing/animations/use-scroll-reveal";
import { templateRegistry } from "@/components/resume/templates/template-registry";
import { templateOrder, templateConfigs } from "@/components/resume/templates/shared/template-config";
import { sampleResumeData } from "@/lib/resume/sample-data";
import type { TemplateId } from "@/lib/types/resume";

const PAGE_WIDTH_IN = 8.5;
const SCALE = 0.28;

function TemplateCard({ id }: { id: TemplateId }) {
  const { Dom } = templateRegistry[id];
  const cfg = templateConfigs[id];
  const data = { ...sampleResumeData, templateId: id };

  return (
    <div data-reveal className="group">
      <div className="overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div
          className="mx-auto aspect-[8.5/11] w-full overflow-hidden rounded-md bg-white"
          style={{ width: `${PAGE_WIDTH_IN * SCALE}in` }}
        >
          <div
            style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: `${PAGE_WIDTH_IN}in` }}
          >
            <Dom data={data} />
          </div>
        </div>
      </div>
      <h3 className="mt-4 font-medium text-foreground">{cfg.label}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{cfg.description}</p>
    </div>
  );
}

export function TemplatesShowcase() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="templates" className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            ATS-safe templates, real design
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every template is strictly single-column and text-based under the hood — parsers see
            clean content, you see a polished resume. These are the actual templates, not mockups.
          </p>
        </div>

        <div ref={ref} className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {templateOrder.map((id) => (
            <TemplateCard key={id} id={id} />
          ))}
        </div>
      </div>
    </section>
  );
}
