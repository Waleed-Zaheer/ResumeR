"use client";

import { useResumeStore } from "@/store/resume-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StepSummary() {
  const summary = useResumeStore((s) => s.data.summary);
  const setData = useResumeStore((s) => s.setData);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Summary</h2>
        <p className="text-sm text-muted-foreground">
          A short 2-4 sentence pitch that sits at the top of your resume.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Professional summary</Label>
        <Textarea
          id="summary"
          rows={8}
          value={summary}
          onChange={(e) => setData({ summary: e.target.value })}
          placeholder="Results-driven engineer with 6+ years building..."
        />
        <p className="text-xs text-muted-foreground">{summary.length} characters</p>
      </div>
    </div>
  );
}
