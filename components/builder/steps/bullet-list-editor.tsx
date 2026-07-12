"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function BulletListEditor({
  bullets,
  onChange,
  label = "Bullet points",
}: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  label?: string;
}) {
  const [draft, setDraft] = useState("");

  function addBullet() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...bullets, trimmed]);
    setDraft("");
  }

  function updateBullet(index: number, value: string) {
    const next = [...bullets];
    next[index] = value;
    onChange(next);
  }

  function removeBullet(index: number) {
    onChange(bullets.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1.5">
        {bullets.map((bullet, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={bullet}
              onChange={(e) => updateBullet(index, e.target.value)}
              placeholder="Describe an accomplishment…"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeBullet(index)}
              aria-label="Remove bullet"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addBullet();
            }
          }}
          placeholder="Add a bullet point and press Enter"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={addBullet}
          aria-label="Add bullet"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
