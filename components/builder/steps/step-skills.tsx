"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, X } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import type { SkillGroup } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function emptySkillGroup(): SkillGroup {
  return { id: nanoid(), category: "", items: [] };
}

function SkillTagInput({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(value: string) {
    const trimmed = value.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={`Remove ${item}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => {
          const value = e.target.value;
          if (value.includes(",")) {
            const [before, ...rest] = value.split(",");
            commit(before);
            setDraft(rest.join(","));
            return;
          }
          setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            setDraft("");
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            commit(draft);
            setDraft("");
          }
        }}
        placeholder="Type a skill, press Enter or comma"
      />
    </div>
  );
}

export function StepSkills() {
  const skills = useResumeStore((s) => s.data.skills);
  const setData = useResumeStore((s) => s.setData);

  function update(id: string, patch: Partial<SkillGroup>) {
    setData({ skills: skills.map((group) => (group.id === id ? { ...group, ...patch } : group)) });
  }

  function remove(id: string) {
    setData({ skills: skills.filter((group) => group.id !== id) });
  }

  function add() {
    setData({ skills: [...skills, emptySkillGroup()] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Skills</h2>
          <p className="text-sm text-muted-foreground">Group related skills under a category.</p>
        </div>
        <Button type="button" size="sm" onClick={add}>
          <Plus />
          Add Group
        </Button>
      </div>

      {skills.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No skill groups yet.
        </p>
      )}

      <div className="space-y-4">
        {skills.map((group, index) => (
          <Card key={group.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {group.category || `Group ${index + 1}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(group.id)}
                aria-label="Remove skill group"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={group.category}
                  onChange={(e) => update(group.id, { category: e.target.value })}
                  placeholder="e.g. Languages & Frameworks"
                />
              </div>
              <div className="space-y-2">
                <Label>Skills</Label>
                <SkillTagInput items={group.items} onChange={(items) => update(group.id, { items })} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
