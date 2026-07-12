"use client";

import { Check } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import { templateConfigs, templateOrder } from "@/components/resume/templates/shared/template-config";
import { accentColors, accentColorOrder } from "@/components/resume/templates/shared/accent-colors";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StepTemplate() {
  const templateId = useResumeStore((s) => s.data.templateId);
  const accentColor = useResumeStore((s) => s.data.accentColor);
  const pageSize = useResumeStore((s) => s.data.metadata.pageSize);
  const setData = useResumeStore((s) => s.setData);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold">Template & Design</h2>
        <p className="text-sm text-muted-foreground">Choose a layout and accent that fits the role.</p>
      </div>

      <div className="space-y-3">
        <Label>Template</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {templateOrder.map((id) => {
            const config = templateConfigs[id];
            const active = templateId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setData({ templateId: id })}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{config.label}</span>
                  {active && <Check className="size-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Accent color</Label>
        <div className="flex flex-wrap gap-2">
          {accentColorOrder.map((id) => {
            const color = accentColors[id];
            const active = accentColor === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setData({ accentColor: id })}
                aria-label={color.label}
                title={color.label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-transform",
                  active ? "scale-110 border-foreground" : "border-transparent hover:scale-105"
                )}
              >
                <span className="size-6 rounded-full" style={{ backgroundColor: color.hex }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Page size</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={pageSize === "letter" ? "default" : "outline"}
            onClick={() => setData({ metadata: { pageSize: "letter" } })}
          >
            Letter
          </Button>
          <Button
            type="button"
            size="sm"
            variant={pageSize === "a4" ? "default" : "outline"}
            onClick={() => setData({ metadata: { pageSize: "a4" } })}
          >
            A4
          </Button>
        </div>
      </div>
    </div>
  );
}
