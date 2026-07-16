import { Hero } from "@/components/landing/sections/hero";
import { Features } from "@/components/landing/sections/features";
import { TemplatesShowcase } from "@/components/landing/sections/templates-showcase";
import { HowItWorks } from "@/components/landing/sections/how-it-works";
import { Cta } from "@/components/landing/sections/cta";
import { templateOrder, templateConfigs } from "@/components/resume/templates/shared/template-config";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ResumeForge",
  url: siteUrl,
  description:
    "Build a polished, ATS-friendly resume in minutes. Live preview, multiple templates, instant PDF and DOCX export.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "ATS-safe resume templates",
    "Live preview while editing",
    "Instant PDF and DOCX export",
    ...templateOrder.map((id) => `${templateConfigs[id].label} template`),
  ],
};

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <Features />
      <TemplatesShowcase />
      <HowItWorks />
      <Cta />
    </>
  );
}
