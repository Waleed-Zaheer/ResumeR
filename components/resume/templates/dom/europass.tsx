import type { ReactNode } from "react";
import type { ResumeData, SectionKey, LanguageItem, CefrLevel, EuropassStyle } from "@/lib/types/resume";
import { templateConfigs } from "../shared/template-config";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

/**
 * Europass — follows the official EU CV layout: a labeled personal-information
 * block (with nationality / date of birth / optional photo), reverse-
 * chronological experience and education, and a CEFR (A1-C2) grid for
 * language skills instead of a free-text proficiency label.
 *
 * Three style categories (`data.metadata.europassStyle`) share this layout:
 * - classic: official EU blue, CEFR grid table, photo allowed.
 * - monochrome: same layout in black/gray only, photo allowed.
 * - ats-safe: no color, no tables (CEFR as plain text), never a photo —
 *   maximizes compatibility with ATS resume parsers.
 */

const INK_COLOR = "#171717";
const META_COLOR = "#3f3f46";

interface StyleTokens {
  accent: string;
  useTable: boolean;
  showPhoto: boolean;
}

function getStyleTokens(style: EuropassStyle, showPhoto: boolean): StyleTokens {
  return {
    accent: style === "classic" ? "#003399" : INK_COLOR,
    useTable: style !== "ats-safe",
    showPhoto: style !== "ats-safe" && showPhoto,
  };
}

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
  const style = getStyleTokens(data.metadata.europassStyle, data.metadata.showPhoto);

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
        className="flex items-start justify-between"
        style={{
          borderBottom: `3pt solid ${style.accent}`,
          paddingBottom: "8pt",
          marginBottom: `${cfg.spacingPt.sectionGap}pt`,
          gap: "12pt",
        }}
      >
        <div>
          <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "0.08em", color: style.accent }}>
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
        </div>
        {style.showPhoto && personalInfo.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not an optimizable remote asset
          <img
            src={personalInfo.photo}
            alt=""
            style={{ width: "72pt", height: "72pt", objectFit: "cover", borderRadius: "4pt", flexShrink: 0 }}
          />
        )}
      </header>

      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.sectionGap}pt` }}>
        {renderPersonalInformation(personalInfo, contactParts, cfg.fontSizePt.body, cfg.fontSizePt.meta, style)}
        {data.sectionOrder.map((key) => renderSection(key, data, cfg.fontSizePt.body, cfg.fontSizePt.meta, style))}
      </div>
    </div>
  );
}

function SectionHeading({ accent, children }: { accent: string; children: string }) {
  return (
    <h2
      style={{
        fontSize: "11pt",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: accent,
        margin: 0,
        marginBottom: "6pt",
        paddingBottom: "2pt",
        borderBottom: `1pt solid ${accent}`,
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
  metaPt: number,
  style: StyleTokens
): ReactNode {
  const rows = [
    contactParts.length > 0 && ["Contact", contactParts.join("   •   ")],
    personalInfo.nationality && ["Nationality", personalInfo.nationality],
    personalInfo.dateOfBirth && ["Date of birth", personalInfo.dateOfBirth],
  ].filter((row): row is [string, string] => Boolean(row));

  if (rows.length === 0) return null;

  return (
    <section key="personal-information">
      <SectionHeading accent={style.accent}>Personal Information</SectionHeading>
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

function renderSection(
  key: SectionKey,
  data: ResumeData,
  bodyPt: number,
  metaPt: number,
  style: StyleTokens
): ReactNode {
  switch (key) {
    case "summary":
      return renderSummary(data, bodyPt, style);
    case "experience":
      return renderExperience(data, bodyPt, metaPt, style);
    case "education":
      return renderEducation(data, bodyPt, metaPt, style);
    case "skills":
      return renderSkills(data, bodyPt, style);
    case "projects":
      return renderProjects(data, bodyPt, metaPt, style);
    case "certifications":
      return renderCertifications(data, bodyPt, metaPt, style);
    case "languages":
      return renderLanguages(data, bodyPt, metaPt, style);
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

function renderSummary(data: ResumeData, bodyPt: number, style: StyleTokens): ReactNode {
  if (!data.summary.trim()) return null;
  return (
    <section key="summary">
      <SectionHeading accent={style.accent}>Profile</SectionHeading>
      <p style={{ fontSize: `${bodyPt}pt`, margin: 0, lineHeight: 1.5, color: INK_COLOR }}>{data.summary}</p>
    </section>
  );
}

function renderExperience(data: ResumeData, bodyPt: number, metaPt: number, style: StyleTokens): ReactNode {
  if (data.experience.length === 0) return null;
  const items = sortExperienceDesc(data.experience);
  return (
    <section key="experience">
      <SectionHeading accent={style.accent}>Work Experience</SectionHeading>
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

function renderEducation(data: ResumeData, bodyPt: number, metaPt: number, style: StyleTokens): ReactNode {
  if (data.education.length === 0) return null;
  return (
    <section key="education">
      <SectionHeading accent={style.accent}>Education and Training</SectionHeading>
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

function renderSkills(data: ResumeData, bodyPt: number, style: StyleTokens): ReactNode {
  const groups = data.skills.filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <section key="skills">
      <SectionHeading accent={style.accent}>Digital and Other Skills</SectionHeading>
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

function renderProjects(data: ResumeData, bodyPt: number, metaPt: number, style: StyleTokens): ReactNode {
  if (data.projects.length === 0) return null;
  return (
    <section key="projects">
      <SectionHeading accent={style.accent}>Projects</SectionHeading>
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

function renderCertifications(data: ResumeData, bodyPt: number, metaPt: number, style: StyleTokens): ReactNode {
  if (data.certifications.length === 0) return null;
  return (
    <section key="certifications">
      <SectionHeading accent={style.accent}>Certifications</SectionHeading>
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

function renderLanguages(data: ResumeData, bodyPt: number, metaPt: number, style: StyleTokens): ReactNode {
  if (data.languages.length === 0) return null;
  return (
    <section key="languages">
      <SectionHeading accent={style.accent}>Language Skills</SectionHeading>
      <div className="flex flex-col" style={{ gap: "8pt" }}>
        {data.languages.map((lang) => (
          <div key={lang.id} className="flex flex-col" style={{ gap: "3pt" }}>
            <div style={{ fontSize: `${bodyPt}pt`, fontWeight: 700, color: INK_COLOR }}>{lang.language}</div>
            {lang.cefr && style.useTable ? (
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
                          color: style.accent,
                        }}
                      >
                        {cefrCell(lang.cefr?.[col.key])}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ) : lang.cefr ? (
              <div style={{ fontSize: `${metaPt}pt`, color: META_COLOR }}>
                {CEFR_COLUMNS.map((col) => `${col.label}: ${cefrCell(lang.cefr?.[col.key])}`).join("   •   ")}
              </div>
            ) : (
              <div style={{ fontSize: `${metaPt}pt`, color: META_COLOR }}>{lang.proficiency}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
