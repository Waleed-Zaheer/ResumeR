import { ImageResponse } from "next/og";
import { ResumeForgeMark } from "@/components/brand/resume-forge-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
        }}
      >
        <ResumeForgeMark size={size.width * 0.6} color="#eab308" />
      </div>
    ),
    { ...size }
  );
}
