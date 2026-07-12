"use client";

import { useResumeStore } from "@/store/resume-store";
import { templateRegistry } from "@/components/resume/templates/template-registry";
import { cn } from "@/lib/utils";

const PAGE_WIDTH_IN = 8.5;
const SCALE = 0.55;

export function PreviewPanel({ className }: { className?: string }) {
  const data = useResumeStore((s) => s.data);
  const template = templateRegistry[data.templateId];
  const Dom = template?.Dom;

  return (
    <div
      className={cn(
        "h-full overflow-auto rounded-lg border border-border bg-muted/30 p-4",
        className
      )}
    >
      <div className="mx-auto" style={{ width: `${PAGE_WIDTH_IN * SCALE}in` }}>
        <div
          style={{
            transform: `scale(${SCALE})`,
            transformOrigin: "top left",
            width: `${PAGE_WIDTH_IN}in`,
          }}
          className="rounded-sm bg-white shadow-sm"
        >
          {Dom ? (
            <Dom data={data} />
          ) : (
            <div className="p-12 text-sm text-muted-foreground">Loading template…</div>
          )}
        </div>
      </div>
    </div>
  );
}
