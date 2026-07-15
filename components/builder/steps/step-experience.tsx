"use client";

import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import type { ExperienceItem } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BulletListEditor } from "@/components/builder/steps/bullet-list-editor";

function emptyExperience(): ExperienceItem {
  return {
    id: nanoid(),
    company: "",
    role: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: [],
  };
}

export function StepExperience() {
  const experience = useResumeStore((s) => s.data.experience);
  const setData = useResumeStore((s) => s.setData);

  function update(id: string, patch: Partial<ExperienceItem>) {
    setData({ experience: experience.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function remove(id: string) {
    setData({ experience: experience.filter((item) => item.id !== id) });
  }

  function add() {
    setData({ experience: [...experience, emptyExperience()] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Experience</h2>
          <p className="text-sm text-muted-foreground">Add roles, most recent first.</p>
        </div>
        <Button type="button" size="sm" onClick={add}>
          <Plus />
          Add Experience
        </Button>
      </div>

      {experience.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No experience added yet.
        </p>
      )}

      <div className="space-y-4">
        {experience.map((item, index) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {item.role || item.company
                  ? `${item.role || "Role"} · ${item.company || "Company"}`
                  : `Experience ${index + 1}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(item.id)}
                aria-label="Remove experience"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={item.company}
                    onChange={(e) => update(item.id, { company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={item.role}
                    onChange={(e) => update(item.id, { role: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={item.location}
                    onChange={(e) => update(item.id, { location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="month"
                    value={item.startDate}
                    onChange={(e) => update(item.id, { startDate: e.target.value })}
                    placeholder="YYYY-MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    type="month"
                    value={item.endDate}
                    disabled={item.current}
                    onChange={(e) => update(item.id, { endDate: e.target.value })}
                    placeholder="YYYY-MM"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`current-${item.id}`}
                  checked={item.current}
                  onCheckedChange={(checked) =>
                    update(item.id, { current: checked, endDate: checked ? "" : item.endDate })
                  }
                />
                <Label htmlFor={`current-${item.id}`} className="font-normal">
                  I currently work here
                </Label>
              </div>
              <BulletListEditor
                bullets={item.bullets}
                onChange={(bullets) => update(item.id, { bullets })}
                label="Highlights"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
