import { ImageResponse } from "next/og";
import { ResumeForgeMark } from "@/components/brand/resume-forge-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<ResumeForgeMark size={32} />, { ...size });
}
