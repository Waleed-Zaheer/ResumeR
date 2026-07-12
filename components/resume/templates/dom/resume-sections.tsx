import type { CSSProperties, ReactNode } from "react";
import type { ResumeData, SectionKey } from "@/lib/types/resume";
import { templateConfigs, type TemplateConfig } from "../shared/template-config";
import { accentColors } from "../shared/accent-colors";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

/**
 * Shared, non-exported-from-registry rendering logic for the on-screen (DOM)
 * resume templates. Each template in `dom/*.tsx` is a thin wrapper around
 * `ResumeShell` that only varies a handful of structural flags — all
 * typography/spacing personality comes from `templateConfigs`.
 */

const META_COLOR = "#3f3f46";
const INK_COLOR = "#171717";

interface ResumeShellProps {
  data: ResumeData;
  /** Right-align the date range on the same line as role/company (modern, executive). */
  justifyDates: boolean;
  /** Center the name/contact header block (executive). */
  centerHeader?: boolean;
  /** Draw a thin accent-colored rule beneath the header (modern). */
  headerRule?: boolean;
  /** Condense skill groups onto a single wrapped line instead of one per row (compact). */
  compactSkills?: boolean;
}

export function ResumeShell({
  data,
  justifyDates,
  centerHeader = false,
  headerRule = false,
  compactSkills = false,
}: ResumeShellProps) {
  const cfg = templateConfigs[data.templateId];
  const accentHex = accentColors[data.accentColor].hex;
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
      <header style={{ marginBottom: `${cfg.spacingPt.sectionGap}pt`, textAlign: centerHeader ? "center" : "left" }}>
        <h1
          style={{
            fontSize: `${cfg.fontSizePt.name}pt`,
            fontWeight: 700,
            margin: 0,
            color: INK_COLOR,
          }}
        >
          {personalInfo.fullName || "Your Name"}
        </h1>
        {personalInfo.jobTitle && (
          <div style={{ fontSize: `${cfg.fontSizePt.body}pt`, marginTop: "2pt", color: META_COLOR }}>
            {personalInfo.jobTitle}
          </div>
        )}
        {contactParts.length > 0 && (
          <div style={{ fontSize: `${cfg.fontSizePt.meta}pt`, marginTop: "4pt", color: META_COLOR }}>
            {contactParts.join("   •   ")}
          </div>
        )}
        {headerRule && (
          <div
            style={{
              marginTop: "8pt",
              borderBottom: `2pt solid ${accentHex}`,
              width: centerHeader ? "60%" : "100%",
              marginLeft: centerHeader ? "auto" : 0,
              marginRight: centerHeader ? "auto" : 0,
            }}
          />
        )}
      </header>
      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.sectionGap}pt` }}>
        {data.sectionOrder.map((key) =>
          renderSection(key, data, cfg, accentHex, justifyDates, compactSkills)
        )}
      </div>
    </div>
  );
}

function renderSection(
  key: SectionKey,
  data: ResumeData,
  cfg: TemplateConfig,
  accentHex: string,
  justifyDates: boolean,
  compactSkills: boolean
): ReactNode {
  switch (key) {
    case "summary":
      return renderSummary(data, cfg, accentHex);
    case "experience":
      return renderExperience(data, cfg, accentHex, justifyDates);
    case "education":
      return renderEducation(data, cfg, accentHex, justifyDates);
    case "skills":
      return renderSkills(data, cfg, accentHex, compactSkills);
    case "projects":
      return renderProjects(data, cfg, accentHex, justifyDates);
    case "certifications":
      return renderCertifications(data, cfg, accentHex, justifyDates);
    case "languages":
      return renderLanguages(data, cfg, accentHex);
    default:
      return null;
  }
}

function SectionHeading({
  cfg,
  accentHex,
  children,
}: {
  cfg: TemplateConfig;
  accentHex: string;
  children: string;
}) {
  const style: CSSProperties = {
    fontSize: `${cfg.fontSizePt.heading}pt`,
    fontWeight: 700,
    margin: 0,
    marginBottom: `${cfg.spacingPt.lineGap + 3}pt`,
    color: INK_COLOR,
  };

  if (cfg.headingStyle === "uppercase") {
    style.textTransform = "uppercase";
    style.letterSpacing = "0.06em";
    if (cfg.showAccentRule) style.color = accentHex;
  } else if (cfg.headingStyle === "underline-rule") {
    style.borderBottom = `1.5pt solid ${cfg.showAccentRule ? accentHex : INK_COLOR}`;
    style.paddingBottom = "3pt";
  }
  // "bold" heading style needs no further treatment beyond the base bold weight.

  return <h2 style={style}>{children}</h2>;
}

interface EntryBlockProps {
  cfg: TemplateConfig;
  heading: string;
  subheading?: string;
  meta?: string;
  dateRange?: string;
  justifyDates: boolean;
  description?: string;
  bullets?: string[];
  extraLine?: string;
}

function EntryBlock({
  cfg,
  heading,
  subheading,
  meta,
  dateRange,
  justifyDates,
  description,
  bullets,
  extraLine,
}: EntryBlockProps) {
  const bodyStyle: CSSProperties = { fontSize: `${cfg.fontSizePt.body}pt`, color: INK_COLOR };
  const metaStyle: CSSProperties = { fontSize: `${cfg.fontSizePt.meta}pt`, color: META_COLOR };
  const titleLine = subheading ? `${heading}, ${subheading}` : heading;

  const metaLine = justifyDates
    ? meta
    : [meta, dateRange].filter((part): part is string => Boolean(part)).join("   •   ");

  return (
    <div className="flex flex-col" style={{ gap: "1pt" }}>
      {justifyDates ? (
        <div className="flex justify-between items-baseline" style={{ gap: "8pt" }}>
          <span style={{ ...bodyStyle, fontWeight: 700 }}>{titleLine}</span>
          {dateRange && <span style={metaStyle}>{dateRange}</span>}
        </div>
      ) : (
        <div style={{ ...bodyStyle, fontWeight: 700 }}>{titleLine}</div>
      )}
      {metaLine && <div style={metaStyle}>{metaLine}</div>}
      {extraLine && <div style={metaStyle}>{extraLine}</div>}
      {description && (
        <p style={{ ...bodyStyle, margin: 0, marginTop: "2pt", lineHeight: 1.4 }}>{description}</p>
      )}
      {bullets && bullets.length > 0 && (
        <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.lineGap}pt`, marginTop: "2pt" }}>
          {bullets.map((bullet, index) => (
            <div key={index} className="flex" style={{ ...bodyStyle, gap: "6pt" }}>
              <span>{"•"}</span>
              <span style={{ flex: 1 }}>{bullet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderSummary(data: ResumeData, cfg: TemplateConfig, accentHex: string): ReactNode {
  if (!data.summary.trim()) return null;
  return (
    <section key="summary">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Summary
      </SectionHeading>
      <p style={{ fontSize: `${cfg.fontSizePt.body}pt`, margin: 0, lineHeight: 1.5, color: INK_COLOR }}>
        {data.summary}
      </p>
    </section>
  );
}

function renderExperience(
  data: ResumeData,
  cfg: TemplateConfig,
  accentHex: string,
  justifyDates: boolean
): ReactNode {
  if (data.experience.length === 0) return null;
  const items = sortExperienceDesc(data.experience);
  return (
    <section key="experience">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Experience
      </SectionHeading>
      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.itemGap}pt` }}>
        {items.map((exp) => (
          <EntryBlock
            key={exp.id}
            cfg={cfg}
            heading={exp.role}
            subheading={exp.company || undefined}
            meta={exp.location || undefined}
            dateRange={formatDateRange(exp.startDate, exp.endDate, exp.current)}
            justifyDates={justifyDates}
            bullets={exp.bullets}
          />
        ))}
      </div>
    </section>
  );
}

function renderEducation(
  data: ResumeData,
  cfg: TemplateConfig,
  accentHex: string,
  justifyDates: boolean
): ReactNode {
  if (data.education.length === 0) return null;
  return (
    <section key="education">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Education
      </SectionHeading>
      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.itemGap}pt` }}>
        {data.education.map((edu) => (
          <EntryBlock
            key={edu.id}
            cfg={cfg}
            heading={edu.fieldOfStudy ? `${edu.degree}, ${edu.fieldOfStudy}` : edu.degree}
            subheading={edu.institution || undefined}
            meta={edu.location || undefined}
            dateRange={formatDateRange(edu.startDate, edu.endDate, edu.current)}
            justifyDates={justifyDates}
            bullets={edu.bullets}
            extraLine={edu.gpa ? `GPA: ${edu.gpa}` : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function renderSkills(
  data: ResumeData,
  cfg: TemplateConfig,
  accentHex: string,
  compact: boolean
): ReactNode {
  const groups = data.skills.filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <section key="skills">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Skills
      </SectionHeading>
      {compact ? (
        <p style={{ fontSize: `${cfg.fontSizePt.body}pt`, margin: 0, lineHeight: 1.4, color: INK_COLOR }}>
          {groups.map((group) => `${group.category}: ${group.items.join(", ")}`).join("   •   ")}
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.lineGap}pt` }}>
          {groups.map((group) => (
            <div key={group.id} style={{ fontSize: `${cfg.fontSizePt.body}pt`, color: INK_COLOR }}>
              <span style={{ fontWeight: 700 }}>{group.category}: </span>
              <span>{group.items.join(", ")}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function renderProjects(
  data: ResumeData,
  cfg: TemplateConfig,
  accentHex: string,
  justifyDates: boolean
): ReactNode {
  if (data.projects.length === 0) return null;
  return (
    <section key="projects">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Projects
      </SectionHeading>
      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.itemGap}pt` }}>
        {data.projects.map((project) => (
          <EntryBlock
            key={project.id}
            cfg={cfg}
            heading={project.name}
            meta={project.url || undefined}
            dateRange={formatDateRange(project.startDate, project.endDate, false)}
            justifyDates={justifyDates}
            description={project.description || undefined}
            bullets={project.bullets}
          />
        ))}
      </div>
    </section>
  );
}

function renderCertifications(
  data: ResumeData,
  cfg: TemplateConfig,
  accentHex: string,
  justifyDates: boolean
): ReactNode {
  if (data.certifications.length === 0) return null;
  return (
    <section key="certifications">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Certifications
      </SectionHeading>
      <div className="flex flex-col" style={{ gap: `${cfg.spacingPt.itemGap}pt` }}>
        {data.certifications.map((cert) => (
          <EntryBlock
            key={cert.id}
            cfg={cfg}
            heading={cert.name}
            subheading={cert.issuer || undefined}
            meta={cert.url || undefined}
            dateRange={cert.date ? formatMonthYear(cert.date) : undefined}
            justifyDates={justifyDates}
          />
        ))}
      </div>
    </section>
  );
}

function renderLanguages(data: ResumeData, cfg: TemplateConfig, accentHex: string): ReactNode {
  if (data.languages.length === 0) return null;
  const text = data.languages.map((lang) => `${lang.language} (${lang.proficiency})`).join(", ");
  return (
    <section key="languages">
      <SectionHeading cfg={cfg} accentHex={accentHex}>
        Languages
      </SectionHeading>
      <p style={{ fontSize: `${cfg.fontSizePt.body}pt`, margin: 0, color: INK_COLOR }}>{text}</p>
    </section>
  );
}
