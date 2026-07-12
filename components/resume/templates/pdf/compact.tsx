import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/types/resume";
import { templateConfigs } from "../shared/template-config";
import { accentColors } from "../shared/accent-colors";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

const cfg = templateConfigs.compact;

export function CompactPdfDocument({ data }: { data: ResumeData }) {
  const accentHex = accentColors[data.accentColor].hex;

  const styles = StyleSheet.create({
    page: {
      padding: 28,
      fontFamily: "Helvetica",
      fontSize: cfg.fontSizePt.body,
      color: "#171717",
    },
    name: {
      fontSize: cfg.fontSizePt.name,
      fontFamily: "Helvetica-Bold",
      marginBottom: 2,
    },
    jobTitle: {
      fontSize: cfg.fontSizePt.body,
      color: "#444444",
      marginBottom: 3,
    },
    meta: {
      fontSize: cfg.fontSizePt.meta,
      color: "#444444",
      marginBottom: 1,
    },
    links: {
      fontSize: cfg.fontSizePt.meta,
      color: "#444444",
      marginBottom: cfg.spacingPt.sectionGap,
    },
    heading: {
      fontSize: cfg.fontSizePt.heading,
      fontFamily: "Helvetica-Bold",
      textTransform: cfg.headingStyle === "uppercase" ? "uppercase" : undefined,
      letterSpacing: cfg.headingStyle === "uppercase" ? 0.5 : undefined,
      marginBottom: cfg.spacingPt.itemGap / 2,
      marginTop: cfg.spacingPt.sectionGap,
      ...(cfg.showAccentRule
        ? { borderBottomWidth: 1, borderBottomColor: accentHex, paddingBottom: 2 }
        : {}),
    },
    itemBlock: { marginBottom: cfg.spacingPt.itemGap },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 1,
    },
    itemTitle: { fontFamily: "Helvetica-Bold" },
    dateText: { fontSize: cfg.fontSizePt.meta, color: "#444444" },
    metaSmall: { fontSize: cfg.fontSizePt.meta, color: "#444444", marginBottom: 1 },
    bodyText: {
      fontSize: cfg.fontSizePt.body,
      marginBottom: cfg.spacingPt.lineGap,
      lineHeight: 1.2,
    },
    bullet: {
      fontSize: cfg.fontSizePt.body,
      marginLeft: 10,
      marginBottom: cfg.spacingPt.lineGap,
    },
  });

  const sortedExperience = sortExperienceDesc(data.experience);

  return (
    <Document>
      <Page size={data.metadata.pageSize === "a4" ? "A4" : "LETTER"} style={styles.page}>
        <Text style={styles.name}>{data.personalInfo.fullName}</Text>
        {data.personalInfo.jobTitle ? (
          <Text style={styles.jobTitle}>{data.personalInfo.jobTitle}</Text>
        ) : null}
        <Text style={styles.meta}>
          {[
            data.personalInfo.email,
            data.personalInfo.phone,
            data.personalInfo.location,
            data.personalInfo.website,
          ]
            .filter(Boolean)
            .join("  |  ")}
        </Text>
        {data.links.length > 0 ? (
          <Text style={styles.links}>
            {data.links.map((link) => `${link.label}: ${link.url}`).join("  |  ")}
          </Text>
        ) : null}

        {data.sectionOrder.map((section) => {
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
                    <View key={exp.id} style={styles.itemBlock}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemTitle}>
                          {exp.company}
                          {exp.role ? ` — ${exp.role}` : ""}
                        </Text>
                        <Text style={styles.dateText}>
                          {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                        </Text>
                      </View>
                      {exp.location ? (
                        <Text style={styles.metaSmall}>{exp.location}</Text>
                      ) : null}
                      {exp.bullets
                        .filter(Boolean)
                        .map((bullet, i) => (
                          <Text key={i} style={styles.bullet}>
                            • {bullet}
                          </Text>
                        ))}
                    </View>
                  ))}
                </View>
              );
            }
            case "education": {
              if (data.education.length === 0) return null;
              return (
                <View key={section}>
                  <Text style={styles.heading}>Education</Text>
                  {data.education.map((edu) => {
                    const metaLine = [edu.fieldOfStudy, edu.location, edu.gpa ? `GPA: ${edu.gpa}` : ""]
                      .filter(Boolean)
                      .join("  |  ");
                    return (
                      <View key={edu.id} style={styles.itemBlock}>
                        <View style={styles.itemRow}>
                          <Text style={styles.itemTitle}>
                            {edu.institution}
                            {edu.degree ? ` — ${edu.degree}` : ""}
                          </Text>
                          <Text style={styles.dateText}>
                            {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                          </Text>
                        </View>
                        {metaLine ? <Text style={styles.metaSmall}>{metaLine}</Text> : null}
                        {edu.bullets
                          .filter(Boolean)
                          .map((bullet, i) => (
                            <Text key={i} style={styles.bullet}>
                              • {bullet}
                            </Text>
                          ))}
                      </View>
                    );
                  })}
                </View>
              );
            }
            case "skills": {
              if (data.skills.length === 0) return null;
              return (
                <View key={section}>
                  <Text style={styles.heading}>Skills</Text>
                  {data.skills.map((group) =>
                    group.items.length > 0 ? (
                      <Text key={group.id} style={styles.bodyText}>
                        <Text style={styles.itemTitle}>{group.category}: </Text>
                        {group.items.join(", ")}
                      </Text>
                    ) : null
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
                    <View key={project.id} style={styles.itemBlock}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemTitle}>{project.name}</Text>
                        <Text style={styles.dateText}>
                          {formatDateRange(project.startDate, project.endDate, false)}
                        </Text>
                      </View>
                      {project.url ? (
                        <Text style={styles.metaSmall}>{project.url}</Text>
                      ) : null}
                      {project.description ? (
                        <Text style={styles.bodyText}>{project.description}</Text>
                      ) : null}
                      {project.bullets
                        .filter(Boolean)
                        .map((bullet, i) => (
                          <Text key={i} style={styles.bullet}>
                            • {bullet}
                          </Text>
                        ))}
                    </View>
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
                    <View key={cert.id} style={styles.itemBlock}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemTitle}>
                          {cert.name}
                          {cert.issuer ? ` — ${cert.issuer}` : ""}
                        </Text>
                        <Text style={styles.dateText}>{formatMonthYear(cert.date)}</Text>
                      </View>
                      {cert.url ? <Text style={styles.metaSmall}>{cert.url}</Text> : null}
                    </View>
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
        })}
      </Page>
    </Document>
  );
}
