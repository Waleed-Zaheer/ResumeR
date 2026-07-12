"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const HeroCanvas = dynamic(
  () => import("@/components/landing/three/hero-canvas").then((m) => m.HeroCanvas),
  {
    ssr: false,
    loading: () => <HeroVisualFallback />,
  }
);

function HeroVisualFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="h-2/3 w-2/3 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute h-1/3 w-1/3 rounded-full bg-primary/50 blur-2xl" />
    </div>
  );
}

/**
 * Client wrapper that decides whether it's safe/worthwhile to mount the WebGL
 * scene: skips it for prefers-reduced-motion and small viewports, falling
 * back to a static CSS gradient blob instead.
 */
export function HeroVisual() {
  const [shouldMount, setShouldMount] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmallViewport = window.innerWidth < 640;
    setShouldMount(!prefersReducedMotion && !isSmallViewport);
    setReady(true);
  }, []);

  if (!ready || !shouldMount) {
    return <HeroVisualFallback />;
  }

  return <HeroCanvas />;
}
