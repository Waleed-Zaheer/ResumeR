import { z } from "zod";

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  jobTitle: z.string().optional().default(""),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")).default(""),
  nationality: z.string().optional().default(""),
  dateOfBirth: z.string().optional().default(""),
});

export const linkItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string().url(),
});

export const experienceItemSchema = z.object({
  id: z.string(),
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  location: z.string().optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM")
    .optional()
    .or(z.literal(""))
    .default(""),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});

export const educationItemSchema = z.object({
  id: z.string(),
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string().optional().default(""),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  current: z.boolean().default(false),
  gpa: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});

export const skillGroupSchema = z.object({
  id: z.string(),
  category: z.string().min(1, "Category is required"),
  items: z.array(z.string()).default([]),
});

export const projectItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
  url: z.string().url().optional().or(z.literal("")).default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
});

export const certificationItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().optional().default(""),
  date: z.string().optional().default(""),
  url: z.string().url().optional().or(z.literal("")).default(""),
});

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const cefrSchema = z.object({
  listening: cefrLevelSchema.optional(),
  reading: cefrLevelSchema.optional(),
  spokenInteraction: cefrLevelSchema.optional(),
  spokenProduction: cefrLevelSchema.optional(),
  writing: cefrLevelSchema.optional(),
});

export const languageItemSchema = z.object({
  id: z.string(),
  language: z.string().min(1),
  proficiency: z.enum(["Native", "Fluent", "Professional", "Conversational", "Basic"]),
  cefr: cefrSchema.optional(),
});

export const templateIdSchema = z.enum(["minimal", "modern", "compact", "executive", "europass"]);
export const accentColorSchema = z.enum(["default", "blue", "green", "slate", "burgundy"]);

export const SECTION_KEYS = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
] as const;

export const resumeDataSchema = z.object({
  personalInfo: personalInfoSchema.default({
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    nationality: "",
    dateOfBirth: "",
  }),
  summary: z.string().default(""),
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  certifications: z.array(certificationItemSchema).default([]),
  languages: z.array(languageItemSchema).default([]),
  links: z.array(linkItemSchema).default([]),
  sectionOrder: z.array(z.enum(SECTION_KEYS)).default([...SECTION_KEYS]),
  templateId: templateIdSchema.default("minimal"),
  accentColor: accentColorSchema.default("default"),
  metadata: z
    .object({ pageSize: z.enum(["letter", "a4"]).default("letter") })
    .default({ pageSize: "letter" }),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;
export type CertificationItem = z.infer<typeof certificationItemSchema>;
export type LanguageItem = z.infer<typeof languageItemSchema>;
export type CefrLevel = z.infer<typeof cefrLevelSchema>;
export type Cefr = z.infer<typeof cefrSchema>;
export type LinkItem = z.infer<typeof linkItemSchema>;
export type TemplateId = z.infer<typeof templateIdSchema>;
export type AccentColor = z.infer<typeof accentColorSchema>;
export type SectionKey = (typeof SECTION_KEYS)[number];

export function createEmptyResumeData(): ResumeData {
  return resumeDataSchema.parse({});
}
