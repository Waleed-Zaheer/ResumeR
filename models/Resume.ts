import { Schema, model, models, type Model } from "mongoose";
import type { ResumeData } from "@/lib/types/resume";
import { SECTION_KEYS } from "@/lib/validations/resume";

const experienceItemSchema = new Schema(
  {
    id: String,
    company: String,
    role: String,
    location: String,
    startDate: String,
    endDate: String,
    current: Boolean,
    bullets: [String],
  },
  { _id: false }
);

const educationItemSchema = new Schema(
  {
    id: String,
    institution: String,
    degree: String,
    fieldOfStudy: String,
    location: String,
    startDate: String,
    endDate: String,
    current: Boolean,
    gpa: String,
    bullets: [String],
  },
  { _id: false }
);

const skillGroupSchema = new Schema(
  { id: String, category: String, items: [String] },
  { _id: false }
);

const projectItemSchema = new Schema(
  {
    id: String,
    name: String,
    description: String,
    bullets: [String],
    url: String,
    startDate: String,
    endDate: String,
  },
  { _id: false }
);

const certificationItemSchema = new Schema(
  { id: String, name: String, issuer: String, date: String, url: String },
  { _id: false }
);

const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

const cefrSchema = new Schema(
  {
    listening: { type: String, enum: cefrLevels },
    reading: { type: String, enum: cefrLevels },
    spokenInteraction: { type: String, enum: cefrLevels },
    spokenProduction: { type: String, enum: cefrLevels },
    writing: { type: String, enum: cefrLevels },
  },
  { _id: false }
);

const languageItemSchema = new Schema(
  {
    id: String,
    language: String,
    proficiency: {
      type: String,
      enum: ["Native", "Fluent", "Professional", "Conversational", "Basic"],
    },
    cefr: cefrSchema,
  },
  { _id: false }
);

const linkItemSchema = new Schema({ id: String, label: String, url: String }, { _id: false });

const resumeDataSchema = new Schema(
  {
    personalInfo: {
      fullName: { type: String, default: "" },
      jobTitle: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      website: { type: String, default: "" },
      nationality: { type: String, default: "" },
      dateOfBirth: { type: String, default: "" },
    },
    summary: { type: String, default: "" },
    experience: [experienceItemSchema],
    education: [educationItemSchema],
    skills: [skillGroupSchema],
    projects: [projectItemSchema],
    certifications: [certificationItemSchema],
    languages: [languageItemSchema],
    links: [linkItemSchema],
    sectionOrder: { type: [String], enum: SECTION_KEYS, default: [...SECTION_KEYS] },
    templateId: {
      type: String,
      enum: ["minimal", "modern", "compact", "executive", "europass"],
      default: "minimal",
    },
    accentColor: { type: String, default: "default" },
    metadata: {
      pageSize: { type: String, enum: ["letter", "a4"], default: "letter" },
    },
  },
  { _id: false }
);

export interface ResumeDoc {
  _id: string;
  userId: string;
  title: string;
  data: ResumeData;
  lastExportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<ResumeDoc>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "Untitled Resume" },
    data: { type: resumeDataSchema, required: true },
    lastExportedAt: { type: Date },
  },
  { timestamps: true }
);

export const Resume = (models.Resume as Model<ResumeDoc>) ?? model<ResumeDoc>("Resume", resumeSchema);
