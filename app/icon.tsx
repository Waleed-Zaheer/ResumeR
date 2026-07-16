import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<ResumeForgeMark size={32} />, { ...size });
}

const INK = "#18181b";
const GOLD = "#eab308";

/**
 * Deliberately just two flat colors and rectangles — no gradients or
 * clip-path corner folds. Those turn to mush at 16-32px; solid bars read
 * as a document/resume glyph at any size.
 */
export function ResumeForgeMark({ size }: { size: number }) {
  const s = size / 32;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: INK,
        borderRadius: 7 * s,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 18 * s,
          height: 22 * s,
          borderRadius: 3 * s,
          background: GOLD,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 3.5 * s,
            top: 6 * s,
            width: 11 * s,
            height: 3 * s,
            borderRadius: 1.5 * s,
            background: INK,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 3.5 * s,
            top: 11.5 * s,
            width: 8 * s,
            height: 2.4 * s,
            borderRadius: 1.2 * s,
            background: INK,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 3.5 * s,
            top: 15.5 * s,
            width: 8 * s,
            height: 2.4 * s,
            borderRadius: 1.2 * s,
            background: INK,
          }}
        />
      </div>
    </div>
  );
}
