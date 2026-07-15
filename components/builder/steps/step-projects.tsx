"use client";

import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import type { ProjectItem } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BulletListEditor } from "@/components/builder/steps/bullet-list-editor";

function emptyProject(): ProjectItem {
  return {
    id: nanoid(),
    name: "",
    description: "",
    bullets: [],
    url: "",
    startDate: "",
    endDate: "",
  };
}

export function StepProjects() {
  const projects = useResumeStore((s) => s.data.projects);
  const setData = useResumeStore((s) => s.setData);

  function update(id: string, patch: Partial<ProjectItem>) {
    setData({ projects: projects.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function remove(id: string) {
    setData({ projects: projects.filter((item) => item.id !== id) });
  }

  function add() {
    setData({ projects: [...projects, emptyProject()] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Showcase side projects and notable work.</p>
        </div>
        <Button type="button" size="sm" onClick={add}>
          <Plus />
          Add Project
        </Button>
      </div>

      {projects.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No projects added yet.
        </p>
      )}

      <div className="space-y-4">
        {projects.map((item, index) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {item.name || `Project ${index + 1}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(item.id)}
                aria-label="Remove project"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => update(item.id, { name: e.target.value })}
                    placeholder="e.g. Personal Portfolio Site"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>URL</Label>
                  <Input
                    value={item.url}
                    onChange={(e) => update(item.id, { url: e.target.value })}
                    placeholder="https://"
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
                    onChange={(e) => update(item.id, { endDate: e.target.value })}
                    placeholder="YYYY-MM"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={item.description}
                  onChange={(e) => update(item.id, { description: e.target.value })}
                  placeholder="What the project does and the impact it had…"
                />
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
