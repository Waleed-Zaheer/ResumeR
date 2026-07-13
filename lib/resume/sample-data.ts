import type { ResumeData } from "@/lib/types/resume";

/**
 * Realistic sample data used to render actual product previews on the
 * marketing site (hero mockup, template showcase) — never placeholder bars.
 */
export const sampleResumeData: ResumeData = {
  personalInfo: {
    fullName: "Maya Chen",
    jobTitle: "Senior Product Designer",
    email: "maya.chen@email.com",
    phone: "(415) 555-0148",
    location: "San Francisco, CA",
    website: "mayachen.design",
  },
  summary:
    "Product designer with 7+ years crafting design systems and B2B SaaS experiences. Led the redesign of a core workflow that increased activation by 34% and cut support tickets by half.",
  experience: [
    {
      id: "s-exp-1",
      company: "Northwind Labs",
      role: "Senior Product Designer",
      location: "San Francisco, CA",
      startDate: "2022-04",
      endDate: "",
      current: true,
      bullets: [
        "Led design for the analytics dashboard used by 40,000+ weekly active users.",
        "Built and maintain the company's design system, adopted by 6 product teams.",
        "Partnered with PM and eng to ship a redesigned onboarding flow, lifting activation 34%.",
      ],
    },
    {
      id: "s-exp-2",
      company: "Brightline",
      role: "Product Designer",
      location: "Remote",
      startDate: "2019-01",
      endDate: "2022-03",
      current: false,
      bullets: [
        "Owned end-to-end design for the billing and subscriptions product area.",
        "Ran quarterly usability studies that informed the 2021 mobile redesign.",
      ],
    },
  ],
  education: [
    {
      id: "s-edu-1",
      institution: "Rhode Island School of Design",
      degree: "B.F.A.",
      fieldOfStudy: "Graphic Design",
      location: "Providence, RI",
      startDate: "2013-09",
      endDate: "2017-05",
      current: false,
      gpa: "",
      bullets: [],
    },
  ],
  skills: [
    { id: "s-sk-1", category: "Design", items: ["Figma", "Design Systems", "Prototyping", "User Research"] },
    { id: "s-sk-2", category: "Collaboration", items: ["Cross-functional leadership", "Design critique", "Roadmapping"] },
  ],
  projects: [
    {
      id: "s-proj-1",
      name: "Component Library v2",
      description: "Open-sourced internal design system used across 6 product teams.",
      bullets: ["1,400+ GitHub stars", "Cut new-feature design time by ~20%"],
      url: "",
      startDate: "2023-01",
      endDate: "",
    },
  ],
  certifications: [
    { id: "s-cert-1", name: "Certified Usability Analyst", issuer: "Human Factors International", date: "2021-06", url: "" },
  ],
  languages: [
    { id: "s-lang-1", language: "English", proficiency: "Native" },
    { id: "s-lang-2", language: "Mandarin", proficiency: "Professional" },
  ],
  links: [{ id: "s-link-1", label: "Portfolio", url: "https://mayachen.design" }],
  sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications", "languages"],
  templateId: "modern",
  accentColor: "blue",
  metadata: { pageSize: "letter" },
};
