"use client";

import { motion } from "motion/react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { ModernTemplate } from "@/components/resume/templates/dom/modern";
import { sampleResumeData } from "@/lib/resume/sample-data";

const PAGE_WIDTH_IN = 8.5;
const SCALE = 0.44;

/**
 * The hero's real focal point: an actual rendered resume (not a stock photo
 * or abstract shape), tilted in CSS 3D, so visitors see the literal product
 * output before they sign up.
 */
export function ResumeMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex w-full max-w-md select-none items-center justify-center [perspective:1800px] lg:max-w-none"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, rotateY: -14 }}
        animate={{ opacity: 1, y: 0, rotateY: -10 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ rotateY: -4, rotateX: 1 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative"
      >
        <div
          className="pointer-events-none overflow-hidden rounded-xl border border-border/60 bg-white shadow-[0_8px_10px_-6px_rgba(0,0,0,0.15),0_20px_40px_-12px_rgba(0,0,0,0.35)]"
          style={{
            width: `${PAGE_WIDTH_IN * SCALE}in`,
            height: "min(60vh, 30rem)",
            maskImage: "linear-gradient(to bottom, black 82%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 82%, transparent 100%)",
          }}
        >
          <div
            style={{
              transform: `scale(${SCALE})`,
              transformOrigin: "top left",
              width: `${PAGE_WIDTH_IN}in`,
            }}
          >
            <ModernTemplate data={sampleResumeData} />
          </div>
        </div>

        {/* Floating credibility badges — real product claims, not decoration for its own sake */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{ transform: "translateZ(60px)" }}
          className="pointer-events-none absolute -left-6 top-10 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:-left-10"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">ATS-safe format</p>
            <p className="text-[0.65rem] text-muted-foreground">Single-column, real text</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{ transform: "translateZ(60px)" }}
          className="pointer-events-none absolute -right-4 bottom-16 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:-right-8"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="size-4 text-primary" />
          </div>
          <p className="text-xs font-semibold text-foreground">Live preview</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
