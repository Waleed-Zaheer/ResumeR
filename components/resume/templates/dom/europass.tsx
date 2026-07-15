import type { ReactNode } from "react";
import type { ResumeData, SectionKey, LanguageItem, CefrLevel } from "@/lib/types/resume";
import { templateConfigs } from "../shared/template-config";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

/**
 * Europass — follows the official EU CV layout: a labeled personal-information
 * block (with nationality / date of birth), reverse-chronological experience
 * and education, and a CEFR (A1-C2) grid for language skills instead of a
 * free-text proficiency label.
 */

const EUROPASS_BLUE = "#003399";
const INK_COLOR = "#171717";
const META_COLOR = "#3f3f46";

const CEFR_COLUMNS: { key: keyof NonNullable<LanguageItem["cefr"]>; label: string }[] = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "spokenInteraction", label: "Spoken interaction" },
  { key: "spokenProduction", label: "Spoken production" },
  { key: "writing", label: "Writing" },
];

export function EuropassTemplate({ data }: { data: ResumeData }) {
  const cfg = templateConfigs.europass;
  const { personalInfo } = data;

  const contactParts = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.website,
    ...data.links.map((link) =>
      link.label && link.url ? `${link.label}: ${link.url}` : link.url || link.label
    ),
  ].filter((part): part is string => Boolean(part && part.trim()));

  return (
    <div
      className="resume-page"
      data-page-size={data.metadata.pageSize}
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <header
        style={{
          borderBottom: `3pt solid ${EUROPASS_BLUE}`,
          paddingBottom: "8pt",
          marginBottom: `${cfg.spacingPt.sectionGap}pt`,
        }}
      >
        <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "0.08em", color: EUROPASS_BLUE }}>
          CURRICULUM VITAE
        </div>
        <h1 style={{ fontSize: `${cfg.fontSizePt.name}pt`, fontWeight: 700, margin: 0, color: INK_COLOR }}>
          {personalInfo.fullName || "Your Name"}
        </h1>
        {personalInfo.jobTitle && (
          <div style={{ fontSize: `${cfg.fontSizePt.body}pt`, marginTop: "2pt", color: META_COLOR }}>
            {personalInfo.jobTitle}
          </div>
        )}
      </header>

      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.sectionGap}pt` }}>
        {renderPersonalInformation(personalInfo, contactParts, cfg.fontSizePt.body, cfg.fontSizePt.meta)}
        {data.sectionOrder.map((key) => renderSection(key, data, cfg.fontSizePt.body, cfg.fontSizePt.meta))}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2
      style={{
        fontSize: "11pt",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: EUROPASS_BLUE,
        margin: 0,
        marginBottom: "6pt",
        paddingBottom: "2pt",
        borderBottom: `1pt solid ${EUROPASS_BLUE}`,
      }}
    >
      {children}
    </h2>
  );
}

function renderPersonalInformation(
  personalInfo: ResumeData["personalInfo"],
  contactParts: string[],
  bodyPt: number,
  metaPt: number
): ReactNode {
  const rows = [
    contactParts.length > 0 && ["Contact", contactParts.join("   •   ")],
    personalInfo.nationality && ["Nationality", personalInfo.nationality],
    personalInfo.dateOfBirth && ["Date of birth", personalInfo.dateOfBirth],
  ].filter((row): row is [string, string] => Boolean(row));

  if (rows.length === 0) return null;

  return (
    <section key="personal-information">
      <SectionHeading>Personal Information</SectionHeading>
      <div className="flex flex-col" style={{ gap: "3pt" }}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex" style={{ gap: "8pt", fontSize: `${bodyPt}pt`, color: INK_COLOR }}>
            <span style={{ fontWeight: 700, width: "110pt", flexShrink: 0, fontSize: `${metaPt}pt`, color: META_COLOR }}>
              {label}
            </span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderSection(key: SectionKey, data: ResumeData, bodyPt: number, metaPt: number): ReactNode {
  switch (key) {
    case "summary":
      return renderSummary(data, bodyPt);
    case "experience":
      return renderExperience(data, bodyPt, metaPt);
    case "education":
      return renderEducation(data, bodyPt, metaPt);
    case "skills":
      return renderSkills(data, bodyPt);
    case "projects":
      return renderProjects(data, bodyPt, metaPt);
    case "certifications":
      return renderCertifications(data, bodyPt, metaPt);
    case "languages":
      return renderLanguages(data, bodyPt, metaPt);
    default:
      return null;
  }
}

function EntryBlock({
  bodyPt,
  metaPt,
  heading,
  subheading,
  meta,
  dateRange,
  description,
  bullets,
  extraLine,
}: {
  bodyPt: number;
  metaPt: number;
  heading: string;
  subheading?: string;
  meta?: string;
  dateRange?: string;
  description?: string;
  bullets?: string[];
  extraLine?: string;
}) {
  const metaLine = [meta, extraLine].filter((part): part is string => Boolean(part)).join("   •   ");
  return (
    <div className="flex flex-col" style={{ gap: "1pt" }}>
      <div className="flex justify-between items-baseline" style={{ gap: "8pt" }}>
        <span style={{ fontSize: `${bodyPt}pt`, fontWeight: 700, color: INK_COLOR }}>
          {subheading ? `${heading}, ${subheading}` : heading}
        </span>
        {dateRange && <span style={{ fontSize: `${metaPt}pt`, color: META_COLOR }}>{dateRange}</span>}
      </div>
      {metaLine && <div style={{ fontSize: `${metaPt}pt`, color: META_COLOR }}>{metaLine}</div>}
      {description && (
        <p style={{ fontSize: `${bodyPt}pt`, margin: 0, marginTop: "2pt", lineHeight: 1.4, color: INK_COLOR }}>
          {description}
        </p>
      )}
      {bullets && bullets.length > 0 && (
        <div className="flex flex-col" style={{ gap: "3pt", marginTop: "2pt" }}>
          {bullets.map((bullet, index) => (
            <div key={index} className="flex" style={{ fontSize: `${bodyPt}pt`, color: INK_COLOR, gap: "6pt" }}>
              <span>{"•"}</span>
              <span style={{ flex: 1 }}>{bullet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderSummary(data: ResumeData, bodyPt: number): ReactNode {
  if (!data.summary.trim()) return null;
  return (
    <section key="summary">
      <SectionHeading>Profile</SectionHeading>
      <p style={{ fontSize: `${bodyPt}pt`, margin: 0, lineHeight: 1.5, color: INK_COLOR }}>{data.summary}</p>
    </section>
  );
}

function renderExperience(data: ResumeData, bodyPt: number, metaPt: number): ReactNode {
  if (data.experience.length === 0) return null;
  const items = sortExperienceDesc(data.experience);
  return (
    <section key="experience">
      <SectionHeading>Work Experience</SectionHeading>
      <div className="flex flex-col" style={{ gap: "8pt" }}>
        {items.map((exp) => (
          <EntryBlock
            key={exp.id}
            bodyPt={bodyPt}
            metaPt={metaPt}
            heading={exp.role}
            subheading={exp.company || undefined}
            meta={exp.location || undefined}
            dateRange={formatDateRange(exp.startDate, exp.endDate, exp.current)}
            bullets={exp.bullets}
          />
        ))}
      </div>
    </section>
  );
}

function renderEducation(data: ResumeData, bodyPt: number, metaPt: number): ReactNode {
  if (data.education.length === 0) return null;
  return (
    <section key="education">
      <SectionHeading>Education and Training</SectionHeading>
      <div className="flex flex-col" style={{ gap: "8pt" }}>
        {data.education.map((edu) => (
          <EntryBlock
            key={edu.id}
            bodyPt={bodyPt}
            metaPt={metaPt}
            heading={edu.fieldOfStudy ? `${edu.degree}, ${edu.fieldOfStudy}` : edu.degree}
            subheading={edu.institution || undefined}
            meta={edu.location || undefined}
            dateRange={formatDateRange(edu.startDate, edu.endDate, edu.current)}
            bullets={edu.bullets}
            extraLine={edu.gpa ? `GPA: ${edu.gpa}` : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function renderSkills(data: ResumeData, bodyPt: number): ReactNode {
  const groups = data.skills.filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <section key="skills">
      <SectionHeading>Digital and Other Skills</SectionHeading>
      <div className="flex flex-col" style={{ gap: "3pt" }}>
        {groups.map((group) => (
          <div key={group.id} style={{ fontSize: `${bodyPt}pt`, color: INK_COLOR }}>
            <span style={{ fontWeight: 700 }}>{group.category}: </span>
            <span>{group.items.join(", ")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderProjects(data: ResumeData, bodyPt: number, metaPt: number): ReactNode {
  if (data.projects.length === 0) return null;
  return (
    <section key="projects">
      <SectionHeading>Projects</SectionHeading>
      <div className="flex flex-col" style={{ gap: "8pt" }}>
        {data.projects.map((project) => (
          <EntryBlock
            key={project.id}
            bodyPt={bodyPt}
            metaPt={metaPt}
            heading={project.name}
            meta={project.url || undefined}
            dateRange={formatDateRange(project.startDate, project.endDate, false)}
            description={project.description || undefined}
            bullets={project.bullets}
          />
        ))}
      </div>
    </section>
  );
}

function renderCertifications(data: ResumeData, bodyPt: number, metaPt: number): ReactNode {
  if (data.certifications.length === 0) return null;
  return (
    <section key="certifications">
      <SectionHeading>Certifications</SectionHeading>
      <div className="flex flex-col" style={{ gap: "8pt" }}>
        {data.certifications.map((cert) => (
          <EntryBlock
            key={cert.id}
            bodyPt={bodyPt}
            metaPt={metaPt}
            heading={cert.name}
            subheading={cert.issuer || undefined}
            meta={cert.url || undefined}
            dateRange={cert.date ? formatMonthYear(cert.date) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function cefrCell(level: CefrLevel | undefined): string {
  return level ?? "—";
}

function renderLanguages(data: ResumeData, bodyPt: number, metaPt: number): ReactNode {
  if (data.languages.length === 0) return null;
  return (
    <section key="languages">
      <SectionHeading>Language Skills</SectionHeading>
      <div className="flex flex-col" style={{ gap: "8pt" }}>
        {data.languages.map((lang) => (
          <div key={lang.id} className="flex flex-col" style={{ gap: "3pt" }}>
            <div style={{ fontSize: `${bodyPt}pt`, fontWeight: 700, color: INK_COLOR }}>{lang.language}</div>
            {lang.cefr ? (
              <table style={{ borderCollapse: "collapse", fontSize: `${metaPt}pt` }}>
                <thead>
                  <tr>
                    {CEFR_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          border: "0.5pt solid #d4d4d8",
                          padding: "3pt 6pt",
                          fontWeight: 700,
                          color: META_COLOR,
                          textAlign: "center",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {CEFR_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          border: "0.5pt solid #d4d4d8",
                          padding: "3pt 6pt",
                          textAlign: "center",
                          fontWeight: 700,
                          color: EUROPASS_BLUE,
                        }}
                      >
                        {cefrCell(lang.cefr?.[col.key])}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: `${metaPt}pt`, color: META_COLOR }}>{lang.proficiency}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
