import type { AccentColor } from "@/lib/types/resume";

export interface AccentColorDef {
  id: AccentColor;
  label: string;
  hex: string;
}

export const accentColors: Record<AccentColor, AccentColorDef> = {
  default: { id: "default", label: "Charcoal", hex: "#27272a" },
  blue: { id: "blue", label: "Blue", hex: "#1d4ed8" },
  green: { id: "green", label: "Green", hex: "#15803d" },
  slate: { id: "slate", label: "Slate", hex: "#334155" },
  burgundy: { id: "burgundy", label: "Burgundy", hex: "#9f1239" },
};

export const accentColorOrder: AccentColor[] = ["default", "blue", "green", "slate", "burgundy"];
