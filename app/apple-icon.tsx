import { ImageResponse } from 'next/og';

import { ResumeForgeMark } from '@/components/brand/resume-forge-mark';

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ResumeForgeMark size={size.width * 0.8} color="#eab308" />
    </div>,
    { ...size },
  );
}
