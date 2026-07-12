"use client";

import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import type { EducationItem } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BulletListEditor } from "@/components/builder/steps/bullet-list-editor";

function emptyEducation(): EducationItem {
  return {
    id: nanoid(),
    institution: "",
    degree: "",
    fieldOfStudy: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    gpa: "",
    bullets: [],
  };
}

export function StepEducation() {
  const education = useResumeStore((s) => s.data.education);
  const setData = useResumeStore((s) => s.setData);

  function update(id: string, patch: Partial<EducationItem>) {
    setData({ education: education.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function remove(id: string) {
    setData({ education: education.filter((item) => item.id !== id) });
  }

  function add() {
    setData({ education: [...education, emptyEducation()] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Education</h2>
          <p className="text-sm text-muted-foreground">Add degrees and programs, most recent first.</p>
        </div>
        <Button type="button" size="sm" onClick={add}>
          <Plus />
          Add Education
        </Button>
      </div>

      {education.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No education added yet.
        </p>
      )}

      <div className="space-y-4">
        {education.map((item, index) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {item.degree || item.institution
                  ? `${item.degree || "Degree"} · ${item.institution || "Institution"}`
                  : `Education ${index + 1}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(item.id)}
                aria-label="Remove education"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={item.institution}
                    onChange={(e) => update(item.id, { institution: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input value={item.degree} onChange={(e) => update(item.id, { degree: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Field of study</Label>
                  <Input
                    value={item.fieldOfStudy}
                    onChange={(e) => update(item.id, { fieldOfStudy: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={item.location} onChange={(e) => update(item.id, { location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="month"
                    value={item.startDate}
                    onChange={(e) => update(item.id, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    type="month"
                    value={item.endDate}
                    disabled={item.current}
                    onChange={(e) => update(item.id, { endDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA</Label>
                  <Input value={item.gpa} onChange={(e) => update(item.id, { gpa: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`current-edu-${item.id}`}
                  checked={item.current}
                  onCheckedChange={(checked) =>
                    update(item.id, { current: checked, endDate: checked ? "" : item.endDate })
                  }
                />
                <Label htmlFor={`current-edu-${item.id}`} className="font-normal">
                  I currently study here
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
