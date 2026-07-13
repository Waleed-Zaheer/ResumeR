import { Hero } from "@/components/landing/sections/hero";
import { Features } from "@/components/landing/sections/features";
import { TemplatesShowcase } from "@/components/landing/sections/templates-showcase";
import { HowItWorks } from "@/components/landing/sections/how-it-works";
import { Cta } from "@/components/landing/sections/cta";

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <Features />
      <TemplatesShowcase />
      <HowItWorks />
      <Cta />
    </>
  );
}
