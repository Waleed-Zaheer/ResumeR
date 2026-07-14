"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

/**
 * Compatibility shim for UI components ported from the my-snippets kit,
 * which expect `useTheme()` to return a resolved `"dark" | "light"` theme.
 * Wraps next-themes and collapses `"system"` into its resolved value.
 */
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  return { theme: (resolvedTheme ?? theme ?? "light") as "dark" | "light", setTheme };
}
