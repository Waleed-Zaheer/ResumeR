"use client";

import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import type { CefrLevel, CertificationItem, LanguageItem } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROFICIENCIES: LanguageItem["proficiency"][] = [
  "Native",
  "Fluent",
  "Professional",
  "Conversational",
  "Basic",
];

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const CEFR_FIELDS: { key: keyof NonNullable<LanguageItem["cefr"]>; label: string }[] = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "spokenInteraction", label: "Spoken interaction" },
  { key: "spokenProduction", label: "Spoken production" },
  { key: "writing", label: "Writing" },
];

function emptyCertification(): CertificationItem {
  return { id: nanoid(), name: "", issuer: "", date: "", url: "" };
}

function emptyLanguage(): LanguageItem {
  return { id: nanoid(), language: "", proficiency: "Professional" };
}

export function StepCertificationsLanguages() {
  const certifications = useResumeStore((s) => s.data.certifications);
  const languages = useResumeStore((s) => s.data.languages);
  const setData = useResumeStore((s) => s.setData);

  function updateCertification(id: string, patch: Partial<CertificationItem>) {
    setData({
      certifications: certifications.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }
  function removeCertification(id: string) {
    setData({ certifications: certifications.filter((item) => item.id !== id) });
  }
  function addCertification() {
    setData({ certifications: [...certifications, emptyCertification()] });
  }

  function updateLanguage(id: string, patch: Partial<LanguageItem>) {
    setData({ languages: languages.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }
  function removeLanguage(id: string) {
    setData({ languages: languages.filter((item) => item.id !== id) });
  }
  function addLanguage() {
    setData({ languages: [...languages, emptyLanguage()] });
  }

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Certifications</h2>
            <p className="text-sm text-muted-foreground">Licenses and certifications you hold.</p>
          </div>
          <Button type="button" size="sm" onClick={addCertification}>
            <Plus />
            Add Certification
          </Button>
        </div>

        {certifications.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No certifications added yet.
          </p>
        )}

        <div className="space-y-4">
          {certifications.map((item, index) => (
            <Card key={item.id}>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <p className="truncate text-sm font-medium text-muted-foreground">
                  {item.name || `Certification ${index + 1}`}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeCertification(item.id)}
                  aria-label="Remove certification"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateCertification(item.id, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issuer</Label>
                  <Input
                    value={item.issuer}
                    onChange={(e) => updateCertification(item.id, { issuer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="month"
                    value={item.date}
                    onChange={(e) => updateCertification(item.id, { date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={item.url}
                    onChange={(e) => updateCertification(item.id, { url: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Languages</h2>
            <p className="text-sm text-muted-foreground">Languages you speak and your proficiency.</p>
          </div>
          <Button type="button" size="sm" onClick={addLanguage}>
            <Plus />
            Add Language
          </Button>
        </div>

        {languages.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No languages added yet.
          </p>
        )}

        <div className="space-y-4">
          {languages.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2">
                  <Input
                    value={item.language}
                    onChange={(e) => updateLanguage(item.id, { language: e.target.value })}
                    placeholder="Language"
                    className="flex-1"
                  />
                  <Select
                    value={item.proficiency}
                    onValueChange={(value) =>
                      updateLanguage(item.id, { proficiency: value as LanguageItem["proficiency"] })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLanguage(item.id)}
                    aria-label="Remove language"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    CEFR levels (used by the Europass template)
                  </Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {CEFR_FIELDS.map((field) => (
                      <Select
                        key={field.key}
                        value={item.cefr?.[field.key] ?? "unset"}
                        onValueChange={(value) =>
                          updateLanguage(item.id, {
                            cefr: {
                              ...item.cefr,
                              [field.key]: value === "unset" ? undefined : (value as CefrLevel),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={field.label} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">{field.label}</SelectItem>
                          {CEFR_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {field.label} — {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
