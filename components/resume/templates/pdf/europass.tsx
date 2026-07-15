import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData, SectionKey, LanguageItem, CefrLevel, EuropassStyle } from "@/lib/types/resume";
import { templateConfigs } from "../shared/template-config";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

/**
 * Europass PDF export — mirrors `EuropassTemplate` (the on-screen DOM
 * equivalent), including the classic/monochrome/ats-safe style categories
 * and the optional photo.
 */

const INK_COLOR = "#171717";

function getAccent(style: EuropassStyle): string {
  return style === "classic" ? "#003399" : INK_COLOR;
}

const CEFR_COLUMNS: { key: keyof NonNullable<LanguageItem["cefr"]>; label: string }[] = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "spokenInteraction", label: "Spoken\ninteraction" },
  { key: "spokenProduction", label: "Spoken\nproduction" },
  { key: "writing", label: "Writing" },
];

export function EuropassPdfDocument({ data }: { data: ResumeData }) {
  const cfg = templateConfigs.europass;
  const accent = getAccent(data.metadata.europassStyle);
  const useTable = data.metadata.europassStyle !== "ats-safe";
  const showPhoto = useTable && data.metadata.showPhoto && Boolean(data.personalInfo.photo);
  const styles = buildStyles(cfg.fontSizePt.name, cfg.fontSizePt.body, cfg.fontSizePt.meta, accent);
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
        <View style={[styles.header, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View>
            <Text style={styles.eyebrow}>CURRICULUM VITAE</Text>
            <Text style={styles.name}>{personalInfo.fullName || "Your Name"}</Text>
            {personalInfo.jobTitle ? <Text style={styles.jobTitle}>{personalInfo.jobTitle}</Text> : null}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop */}
          {showPhoto ? <Image src={personalInfo.photo} style={styles.photo} /> : null}
        </View>

        {renderPersonalInformation(personalInfo, contactParts, styles)}
        {data.sectionOrder.map((section) => renderSection(section, data, sortedExperience, styles, useTable))}
      </Page>
    </Document>
  );
}

function buildStyles(namePt: number, bodyPt: number, metaPt: number, accent: string) {
  return StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: bodyPt, color: "#171717" },
    header: { borderBottomWidth: 3, borderBottomColor: accent, paddingBottom: 8, marginBottom: 14 },
    photo: { width: 56, height: 56, borderRadius: 3, objectFit: "cover" },
    eyebrow: { fontSize: 8, fontFamily: "Helvetica-Bold", color: accent, letterSpacing: 1, marginBottom: 2 },
    name: { fontSize: namePt, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    jobTitle: { fontSize: bodyPt, color: "#444444" },
    heading: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: accent,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 14,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: 2,
    },
    row: { flexDirection: "row", marginBottom: 3 },
    rowLabel: { width: 80, fontSize: metaPt, fontFamily: "Helvetica-Bold", color: "#444444" },
    rowValue: { fontSize: bodyPt, color: "#171717", flex: 1 },
    itemBlock: { marginBottom: 8 },
    itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 1 },
    itemTitle: { fontFamily: "Helvetica-Bold", color: "#171717" },
    dateText: { fontSize: metaPt, color: "#444444" },
    metaSmall: { fontSize: metaPt, color: "#444444", marginBottom: 1 },
    bodyText: { fontSize: bodyPt, marginBottom: 3, lineHeight: 1.3 },
    bullet: { fontSize: bodyPt, marginLeft: 10, marginBottom: 3 },
    langName: { fontSize: bodyPt, fontFamily: "Helvetica-Bold", marginBottom: 3 },
    cefrTable: { flexDirection: "row", marginBottom: 8, borderWidth: 0.5, borderColor: "#d4d4d8" },
    cefrCol: { flex: 1, borderRightWidth: 0.5, borderRightColor: "#d4d4d8" },
    cefrHeadCell: {
      fontSize: metaPt - 1,
      fontFamily: "Helvetica-Bold",
      color: "#444444",
      textAlign: "center",
      padding: 3,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d4d4d8",
    },
    cefrValueCell: {
      fontSize: metaPt,
      fontFamily: "Helvetica-Bold",
      color: accent,
      textAlign: "center",
      padding: 3,
    },
  });
}

type Styles = ReturnType<typeof buildStyles>;

function renderPersonalInformation(
  personalInfo: ResumeData["personalInfo"],
  contactParts: string[],
  styles: Styles
) {
  const rows = [
    contactParts.length > 0 && ["Contact", contactParts.join("   •   ")],
    personalInfo.nationality && ["Nationality", personalInfo.nationality],
    personalInfo.dateOfBirth && ["Date of birth", personalInfo.dateOfBirth],
  ].filter((row): row is [string, string] => Boolean(row));

  if (rows.length === 0) return null;

  return (
    <View key="personal-information">
      <Text style={styles.heading}>Personal Information</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function EntryBlock({
  styles,
  heading,
  meta,
  dateRange,
  description,
  bullets,
  extraLine,
}: {
  styles: Styles;
  heading: string;
  meta?: string;
  dateRange?: string;
  description?: string;
  bullets?: string[];
  extraLine?: string;
}) {
  const metaLine = [meta, extraLine].filter((part): part is string => Boolean(part)).join("   •   ");
  return (
    <View style={styles.itemBlock}>
      <View style={styles.itemRow}>
        <Text style={styles.itemTitle}>{heading}</Text>
        {dateRange ? <Text style={styles.dateText}>{dateRange}</Text> : null}
      </View>
      {metaLine ? <Text style={styles.metaSmall}>{metaLine}</Text> : null}
      {description ? <Text style={styles.bodyText}>{description}</Text> : null}
      {bullets?.filter(Boolean).map((bullet, i) => (
        <Text key={i} style={styles.bullet}>
          • {bullet}
        </Text>
      ))}
    </View>
  );
}

function cefrCell(level: CefrLevel | undefined): string {
  return level ?? "—";
}

function renderSection(
  section: SectionKey,
  data: ResumeData,
  sortedExperience: ResumeData["experience"],
  styles: Styles,
  useTable: boolean
) {
  switch (section) {
    case "summary": {
      if (!data.summary.trim()) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Profile</Text>
          <Text style={styles.bodyText}>{data.summary}</Text>
        </View>
      );
    }
    case "experience": {
      if (sortedExperience.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Work Experience</Text>
          {sortedExperience.map((exp) => (
            <EntryBlock
              key={exp.id}
              styles={styles}
              heading={exp.role ? `${exp.role}, ${exp.company}` : exp.company}
              meta={exp.location || undefined}
              dateRange={formatDateRange(exp.startDate, exp.endDate, exp.current)}
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
          <Text style={styles.heading}>Education and Training</Text>
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
          <Text style={styles.heading}>Digital and Other Skills</Text>
          {groups.map((group) => (
            <Text key={group.id} style={styles.bodyText}>
              <Text style={styles.itemTitle}>{group.category}: </Text>
              {group.items.join(", ")}
            </Text>
          ))}
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
            />
          ))}
        </View>
      );
    }
    case "languages": {
      if (data.languages.length === 0) return null;
      return (
        <View key={section}>
          <Text style={styles.heading}>Language Skills</Text>
          {data.languages.map((lang) => (
            <View key={lang.id} wrap={false}>
              <Text style={styles.langName}>{lang.language}</Text>
              {lang.cefr && useTable ? (
                <View style={styles.cefrTable}>
                  {CEFR_COLUMNS.map((col, i) => (
                    <View key={col.key} style={i === CEFR_COLUMNS.length - 1 ? { flex: 1 } : styles.cefrCol}>
                      <Text style={styles.cefrHeadCell}>{col.label}</Text>
                      <Text style={styles.cefrValueCell}>{cefrCell(lang.cefr?.[col.key])}</Text>
                    </View>
                  ))}
                </View>
              ) : lang.cefr ? (
                <Text style={styles.metaSmall}>
                  {CEFR_COLUMNS.map((col) => `${col.label.replace("\n", " ")}: ${cefrCell(lang.cefr?.[col.key])}`).join(
                    "   •   "
                  )}
                </Text>
              ) : (
                <Text style={styles.metaSmall}>{lang.proficiency}</Text>
              )}
            </View>
          ))}
        </View>
      );
    }
    default:
      return null;
  }
}
