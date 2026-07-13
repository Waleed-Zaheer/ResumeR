import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData, SectionKey } from "@/lib/types/resume";
import { templateConfigs, type TemplateConfig } from "../shared/template-config";
import { accentColors } from "../shared/accent-colors";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

/**
 * Shared react-pdf rendering logic for all 4 export templates — mirrors
 * `ResumeShell` (the DOM/on-screen equivalent) structural flag-for-flag so a
 * selected template looks the same on screen and in the exported PDF.
 */
interface ResumeDocumentProps {
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

export function ResumeDocument({
  data,
  justifyDates,
  centerHeader = false,
  headerRule = false,
  compactSkills = false,
}: ResumeDocumentProps) {
  const cfg = templateConfigs[data.templateId];
  const accentHex = accentColors[data.accentColor].hex;
  const styles = buildStyles(cfg, accentHex);
  const sortedExperience = sortExperienceDesc(data.experience);
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
    <Document>
      <Page size={data.metadata.pageSize === "a4" ? "A4" : "LETTER"} style={styles.page}>
        <View style={centerHeader ? styles.headerCenter : undefined}>
          <Text style={styles.name}>{personalInfo.fullName || "Your Name"}</Text>
          {personalInfo.jobTitle ? <Text style={styles.jobTitle}>{personalInfo.jobTitle}</Text> : null}
          {contactParts.length > 0 ? (
            <Text style={styles.meta}>{contactParts.join("   •   ")}</Text>
          ) : null}
          {headerRule ? (
            <View style={centerHeader ? styles.headerRuleCenter : styles.headerRule} />
          ) : null}
        </View>

        {data.sectionOrder.map((section) =>
          renderSection(section, data, sortedExperience, styles, justifyDates, compactSkills)
        )}
      </Page>
    </Document>
  );
}

function buildStyles(cfg: TemplateConfig, accentHex: string) {
  const headingColor = cfg.headingStyle === "uppercase" && cfg.showAccentRule ? accentHex : "#171717";

  return StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: cfg.fontSizePt.body, color: "#171717" },
    headerCenter: { alignItems: "center" },
    name: { fontSize: cfg.fontSizePt.name, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    jobTitle: { fontSize: cfg.fontSizePt.body, color: "#444444", marginBottom: 4 },
    meta: { fontSize: cfg.fontSizePt.meta, color: "#444444" },
    headerRule: { marginTop: 8, borderBottomWidth: 1.5, borderBottomColor: accentHex, width: "100%" },
    headerRuleCenter: { marginTop: 8, borderBottomWidth: 1.5, borderBottomColor: accentHex, width: "60%" },
    heading: {
      fontSize: cfg.fontSizePt.heading,
      fontFamily: "Helvetica-Bold",
      color: headingColor,
      textTransform: cfg.headingStyle === "uppercase" ? "uppercase" : undefined,
      letterSpacing: cfg.headingStyle === "uppercase" ? 0.5 : undefined,
      marginBottom: cfg.spacingPt.lineGap + 2,
      marginTop: cfg.spacingPt.sectionGap,
      ...(cfg.headingStyle === "underline-rule"
        ? { borderBottomWidth: 1, borderBottomColor: cfg.showAccentRule ? accentHex : "#171717", paddingBottom: 2 }
        : {}),
    },
    itemBlock: { marginBottom: cfg.spacingPt.itemGap },
    itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 1 },
    itemTitle: { fontFamily: "Helvetica-Bold", color: "#171717" },
    dateText: { fontSize: cfg.fontSizePt.meta, color: "#444444" },
    metaSmall: { fontSize: cfg.fontSizePt.meta, color: "#444444", marginBottom: 1 },
    bodyText: { fontSize: cfg.fontSizePt.body, marginBottom: cfg.spacingPt.lineGap, lineHeight: 1.3 },
    bullet: { fontSize: cfg.fontSizePt.body, marginLeft: 10, marginBottom: cfg.spacingPt.lineGap },
  });
}

type Styles = ReturnType<typeof buildStyles>;

function EntryBlock({
  styles,
  heading,
  meta,
  dateRange,
  justifyDates,
  description,
  bullets,
  extraLine,
}: {
  styles: Styles;
  heading: string;
  meta?: string;
  dateRange?: string;
  justifyDates: boolean;
  description?: string;
  bullets?: string[];
  extraLine?: string;
}) {
  const metaLine = justifyDates
    ? meta
    : [meta, dateRange].filter((part): part is string => Boolean(part)).join("   •   ");

  return (
    <View style={styles.itemBlock}>
      {justifyDates ? (
        <View style={styles.itemRow}>
          <Text style={styles.itemTitle}>{heading}</Text>
          {dateRange ? <Text style={styles.dateText}>{dateRange}</Text> : null}
        </View>
      ) : (
        <Text style={styles.itemTitle}>{heading}</Text>
      )}
      {metaLine ? <Text style={styles.metaSmall}>{metaLine}</Text> : null}
      {extraLine ? <Text style={styles.metaSmall}>{extraLine}</Text> : null}
      {description ? <Text style={styles.bodyText}>{description}</Text> : null}
      {bullets?.filter(Boolean).map((bullet, i) => (
        <Text key={i} style={styles.bullet}>
          • {bullet}
        </Text>
      ))}
    </View>
  );
}

function renderSection(
  section: SectionKey,
  data: ResumeData,
  sortedExperience: ResumeData["experience"],
  styles: Styles,
  justifyDates: boolean,
  compactSkills: boolean
) {
  switch (section) {
    case "summary": {
      if (!data.summary.trim()) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Summary</Text>
          <Text style={styles.bodyText}>{data.summary}</Text>
        </View>
      );
    }
    case "experience": {
      if (sortedExperience.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Experience</Text>
          {sortedExperience.map((exp) => (
            <EntryBlock
              key={exp.id}
              styles={styles}
              heading={exp.role ? `${exp.role}, ${exp.company}` : exp.company}
              meta={exp.location || undefined}
              dateRange={formatDateRange(exp.startDate, exp.endDate, exp.current)}
              justifyDates={justifyDates}
              bullets={exp.bullets}
            />
          ))}
        </View>
      );
    }
    case "education": {
      if (data.education.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Education</Text>
          {data.education.map((edu) => (
            <EntryBlock
              key={edu.id}
              styles={styles}
              heading={
                edu.fieldOfStudy
                  ? `${edu.degree}, ${edu.fieldOfStudy}, ${edu.institution}`
                  : `${edu.degree}, ${edu.institution}`
              }
              meta={edu.location || undefined}
              dateRange={formatDateRange(edu.startDate, edu.endDate, edu.current)}
              justifyDates={justifyDates}
              bullets={edu.bullets}
              extraLine={edu.gpa ? `GPA: ${edu.gpa}` : undefined}
            />
          ))}
        </View>
      );
    }
    case "skills": {
      const groups = data.skills.filter((g) => g.items.length > 0);
      if (groups.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Skills</Text>
          {compactSkills ? (
            <Text style={styles.bodyText}>
              {groups.map((g) => `${g.category}: ${g.items.join(", ")}`).join("   •   ")}
            </Text>
          ) : (
            groups.map((group) => (
              <Text key={group.id} style={styles.bodyText}>
                <Text style={styles.itemTitle}>{group.category}: </Text>
                {group.items.join(", ")}
              </Text>
            ))
          )}
        </View>
      );
    }
    case "projects": {
      if (data.projects.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Projects</Text>
          {data.projects.map((project) => (
            <EntryBlock
              key={project.id}
              styles={styles}
              heading={project.name}
              meta={project.url || undefined}
              dateRange={formatDateRange(project.startDate, project.endDate, false)}
              justifyDates={justifyDates}
              description={project.description || undefined}
              bullets={project.bullets}
            />
          ))}
        </View>
      );
    }
    case "certifications": {
      if (data.certifications.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Certifications</Text>
          {data.certifications.map((cert) => (
            <EntryBlock
              key={cert.id}
              styles={styles}
              heading={cert.issuer ? `${cert.name}, ${cert.issuer}` : cert.name}
              meta={cert.url || undefined}
              dateRange={cert.date ? formatMonthYear(cert.date) : undefined}
              justifyDates={justifyDates}
            />
          ))}
        </View>
      );
    }
    case "languages": {
      if (data.languages.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Languages</Text>
          <Text style={styles.bodyText}>
            {data.languages.map((lang) => `${lang.language} (${lang.proficiency})`).join(", ")}
          </Text>
        </View>
      );
    }
    default:
      return null;
  }
}
