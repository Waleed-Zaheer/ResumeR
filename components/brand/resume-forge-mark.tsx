import type { SVGProps } from "react";

export interface ResumeForgeMarkProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  /** Icon size in px (width and height). Matches lucide-react's `size` prop. */
  size?: number | string;
  /** Stroke color. Matches lucide-react's `color` prop. */
  color?: string;
  /** Stroke width. Matches lucide-react's `strokeWidth` prop. */
  strokeWidth?: number | string;
}

/**
 * The ResumeForge brand glyph (Lucide's "anvil"), exposed with the same
 * `size`/`color`/`strokeWidth`/`className` API as a lucide-react icon so it
 * drops into the same call sites (favicon routes, marketing nav, anywhere
 * else) without a bespoke prop shape.
 */
export function ResumeForgeMark({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
  ...props
}: ResumeForgeMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4" />
      <path d="M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z" />
      <path d="M9 12v5" />
      <path d="M15 12v5" />
      <path d="M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1" />
    </svg>
  );
}
