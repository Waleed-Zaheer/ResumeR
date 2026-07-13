"use client";

import { useResumeStore } from "@/store/resume-store";
import { templateRegistry } from "@/components/resume/templates/template-registry";
import { templateConfigs } from "@/components/resume/templates/shared/template-config";
import { cn } from "@/lib/utils";

const PAGE_WIDTH_IN = 8.5;
const SCALE = 0.62;

export function PreviewPanel({ className }: { className?: string }) {
  const data = useResumeStore((s) => s.data);
  const template = templateRegistry[data.templateId];
  const Dom = template?.Dom;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between px-6 pt-6 lg:px-10">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Live preview</p>
        </div>
        <p className="text-xs text-muted-foreground">{templateConfigs[data.templateId].label}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6 lg:px-10">
        <div className="mx-auto" style={{ width: `${PAGE_WIDTH_IN * SCALE}in` }}>
          <div
            style={{
              transform: `scale(${SCALE})`,
              transformOrigin: "top left",
              width: `${PAGE_WIDTH_IN}in`,
            }}
            className="rounded-sm bg-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.15),0_12px_24px_-8px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
          >
            {Dom ? (
              <Dom data={data} />
            ) : (
              <div className="p-12 text-sm text-muted-foreground">Loading template…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
