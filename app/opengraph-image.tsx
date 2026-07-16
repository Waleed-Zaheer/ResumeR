import { ImageResponse } from "next/og";
import { ResumeForgeMark } from "@/components/brand/resume-forge-mark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          backgroundColor: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ResumeForgeMark size={72} color="#eab308" strokeWidth={1.75} />
          <span style={{ fontSize: 64, fontWeight: 700, color: "#fafafa" }}>ResumeForge</span>
        </div>
        <span style={{ fontSize: 30, color: "#a1a1aa" }}>ATS-Friendly Resume Builder</span>
      </div>
    ),
    { ...size }
  );
}
