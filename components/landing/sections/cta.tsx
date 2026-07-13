import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-primary/10 px-8 py-16 text-center ring-1 ring-primary/20 sm:px-16">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,var(--color-primary),transparent)] opacity-20"
            aria-hidden="true"
          />
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Ready to build a resume that gets read?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Create a free account and have an ATS-friendly resume ready to export in minutes.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
              Get Started
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
