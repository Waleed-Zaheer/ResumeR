import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, BorderStyle, Table, TableRow, TableCell, WidthType } from "docx";
import type { ResumeData, TemplateId, LanguageItem, CefrLevel } from "@/lib/types/resume";
import { templateConfigs, type TemplateConfig } from "@/components/resume/templates/shared/template-config";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

const FONT = "Calibri"; // docx cannot embed custom font files — Calibri is universally available and ATS-safe
const RIGHT_TAB_POSITION = 9360; // twips: Letter width (12240) minus default 1in margins each side

/** Mirrors the DOM `ResumeShell` / PDF `ResumeDocument` structural flags per template. */
const TEMPLATE_STRUCTURE: Record<
  TemplateId,
  { justifyDates: boolean; centerHeader: boolean; headerRule: boolean; compactSkills: boolean }
> = {
  minimal: { justifyDates: false, centerHeader: false, headerRule: false, compactSkills: false },
  modern: { justifyDates: true, centerHeader: false, headerRule: true, compactSkills: false },
  compact: { justifyDates: false, centerHeader: false, headerRule: false, compactSkills: true },
  executive: { justifyDates: true, centerHeader: true, headerRule: false, compactSkills: false },
  europass: { justifyDates: true, centerHeader: false, headerRule: true, compactSkills: false },
};

const EUROPASS_BLUE = "003399";

const CEFR_COLUMNS: { key: keyof NonNullable<LanguageItem["cefr"]>; label: string }[] = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "spokenInteraction", label: "Spoken interaction" },
  { key: "spokenProduction", label: "Spoken production" },
  { key: "writing", label: "Writing" },
];

function cefrCell(level: CefrLevel | undefined): string {
  return level ?? "—";
}

function pt(fontSizePt: number) {
  return fontSizePt * 2; // docx `size` is in half-points — always go through this helper, never inline * 2
}

function twips(spacingPt: number) {
  return spacingPt * 20; // docx spacing is in twentieths of a point
}

function headingText(cfg: TemplateConfig, label: string) {
  return cfg.headingStyle === "uppercase" ? label.toUpperCase() : label;
}

function headingParagraph(cfg: TemplateConfig, label: string) {
  return new Paragraph({
    spacing: { before: twips(cfg.spacingPt.sectionGap), after: 60 },
    border:
      cfg.headingStyle === "underline-rule"
        ? { bottom: { style: BorderStyle.SINGLE, size: 6, space: 2, color: "444444" } }
        : undefined,
    children: [
      new TextRun({
        text: headingText(cfg, label),
        bold: true,
        size: pt(cfg.fontSizePt.heading),
        font: FONT,
        underline: cfg.headingStyle === "underline-rule" ? {} : undefined,
      }),
    ],
  });
}

/** A title line, optionally paired with a right-tab-stopped date (justifyDates templates). */
function titleParagraph(cfg: TemplateConfig, title: string, dateRange: string | undefined, justifyDates: boolean) {
  const children = [new TextRun({ text: title, bold: true, size: pt(cfg.fontSizePt.body), font: FONT })];
  if (justifyDates && dateRange) {
    children.push(new TextRun({ text: `\t${dateRange}`, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" }));
  }
  return new Paragraph({
    tabStops: justifyDates ? [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }] : undefined,
    spacing: { after: 20 },
    children,
  });
}

function bulletParagraph(cfg: TemplateConfig, bullet: string) {
  return new Paragraph({
    spacing: { after: twips(cfg.spacingPt.lineGap) },
    children: [new TextRun({ text: `• ${bullet}`, size: pt(cfg.fontSizePt.body), font: FONT })],
  });
}

function metaParagraph(cfg: TemplateConfig, text: string, spacingAfter = 0, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new Paragraph({
    alignment,
    spacing: { after: spacingAfter },
    children: [new TextRun({ text, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" })],
  });
}

function buildCefrTable(cfg: TemplateConfig, cefr: NonNullable<LanguageItem["cefr"]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: CEFR_COLUMNS.map(
          (col) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: col.label, bold: true, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" }),
                  ],
                }),
              ],
            })
        ),
      }),
      new TableRow({
        children: CEFR_COLUMNS.map(
          (col) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: cefrCell(cefr[col.key]),
                      bold: true,
                      size: pt(cfg.fontSizePt.meta),
                      font: FONT,
                      color: EUROPASS_BLUE,
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
    ],
  });
}

export function buildDocx(data: ResumeData): Document {
  const cfg = templateConfigs[data.templateId];
  const { justifyDates, centerHeader, headerRule, compactSkills } = TEMPLATE_STRUCTURE[data.templateId];
  const headerAlignment = centerHeader ? AlignmentType.CENTER : undefined;
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: headerAlignment,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: data.personalInfo.fullName || "Your Name", bold: true, size: pt(cfg.fontSizePt.name), font: FONT }),
      ],
    })
  );

  if (data.personalInfo.jobTitle) {
    children.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: data.personalInfo.jobTitle,
            bold: true,
            size: pt(cfg.fontSizePt.body),
            font: FONT,
            color: "444444",
          }),
        ],
      })
    );
  }

  const contactLine = [
    data.personalInfo.email,
    data.personalInfo.phone,
    data.personalInfo.location,
    data.personalInfo.website,
  ]
    .filter(Boolean)
    .join("  |  ");

  const hasLinks = data.links.length > 0;
  const headerTailSpacing = headerRule ? 40 : twips(cfg.spacingPt.sectionGap);

  children.push(
    metaParagraph(cfg, contactLine, hasLinks ? 20 : headerTailSpacing, headerAlignment)
  );

  if (hasLinks) {
    children.push(
      metaParagraph(
        cfg,
        data.links.map((link) => `${link.label}: ${link.url}`).join("  |  "),
        headerTailSpacing,
        headerAlignment
      )
    );
  }

  if (headerRule) {
    children.push(
      new Paragraph({
        spacing: { after: twips(cfg.spacingPt.sectionGap) },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 12,
            space: 4,
            color: data.templateId === "europass" ? EUROPASS_BLUE : "444444",
          },
        },
        children: [],
      })
    );
  }

  if (data.templateId === "europass") {
    const rows: [string, string][] = [];
    if (data.personalInfo.nationality) rows.push(["Nationality", data.personalInfo.nationality]);
    if (data.personalInfo.dateOfBirth) rows.push(["Date of birth", data.personalInfo.dateOfBirth]);
    if (rows.length > 0) {
      children.push(headingParagraph(cfg, "Personal Information"));
      for (const [label, value] of rows) {
        children.push(
          new Paragraph({
            spacing: { after: twips(cfg.spacingPt.lineGap) },
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" }),
              new TextRun({ text: value, size: pt(cfg.fontSizePt.body), font: FONT }),
            ],
          })
        );
      }
    }
  }

  for (const section of data.sectionOrder) {
    switch (section) {
      case "summary": {
        if (!data.summary.trim()) break;
        children.push(headingParagraph(cfg, "Summary"));
        children.push(
          new Paragraph({
            spacing: { after: twips(cfg.spacingPt.lineGap) },
            children: [new TextRun({ text: data.summary, size: pt(cfg.fontSizePt.body), font: FONT })],
          })
        );
        break;
      }
      case "experience": {
        const items = sortExperienceDesc(data.experience);
        if (items.length === 0) break;
        children.push(headingParagraph(cfg, "Experience"));
        for (const exp of items) {
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.current);
          const title = exp.role ? `${exp.role}, ${exp.company}` : exp.company;
          children.push(titleParagraph(cfg, title, dateRange, justifyDates));
          const metaLine = justifyDates ? exp.location : [exp.location, dateRange].filter(Boolean).join("   ");
          if (metaLine) children.push(metaParagraph(cfg, metaLine, twips(cfg.spacingPt.lineGap)));
          for (const bullet of exp.bullets.filter(Boolean)) children.push(bulletParagraph(cfg, bullet));
        }
        break;
      }
      case "education": {
        if (data.education.length === 0) break;
        children.push(headingParagraph(cfg, "Education"));
        for (const edu of data.education) {
          const dateRange = formatDateRange(edu.startDate, edu.endDate, edu.current);
          const title = edu.fieldOfStudy
            ? `${edu.degree}, ${edu.fieldOfStudy}, ${edu.institution}`
            : `${edu.degree}, ${edu.institution}`;
          children.push(titleParagraph(cfg, title, dateRange, justifyDates));
          const metaParts = justifyDates
            ? [edu.location, edu.gpa ? `GPA: ${edu.gpa}` : ""]
            : [edu.location, dateRange, edu.gpa ? `GPA: ${edu.gpa}` : ""];
          const metaLine = metaParts.filter(Boolean).join("   ");
          if (metaLine) children.push(metaParagraph(cfg, metaLine, twips(cfg.spacingPt.lineGap)));
          for (const bullet of edu.bullets.filter(Boolean)) children.push(bulletParagraph(cfg, bullet));
        }
        break;
      }
      case "skills": {
        const groups = data.skills.filter((g) => g.items.length > 0);
        if (groups.length === 0) break;
        children.push(headingParagraph(cfg, "Skills"));
        if (compactSkills) {
          children.push(
            new Paragraph({
              spacing: { after: twips(cfg.spacingPt.lineGap) },
              children: [
                new TextRun({
                  text: groups.map((g) => `${g.category}: ${g.items.join(", ")}`).join("   •   "),
                  size: pt(cfg.fontSizePt.body),
                  font: FONT,
                }),
              ],
            })
          );
        } else {
          for (const group of groups) {
            children.push(
              new Paragraph({
                spacing: { after: twips(cfg.spacingPt.lineGap) },
                children: [
                  new TextRun({ text: `${group.category}: `, bold: true, size: pt(cfg.fontSizePt.body), font: FONT }),
                  new TextRun({ text: group.items.join(", "), size: pt(cfg.fontSizePt.body), font: FONT }),
                ],
              })
            );
          }
        }
        break;
      }
      case "projects": {
        if (data.projects.length === 0) break;
        children.push(headingParagraph(cfg, "Projects"));
        for (const project of data.projects) {
          const dateRange = formatDateRange(project.startDate, project.endDate, false);
          children.push(titleParagraph(cfg, project.name, dateRange, justifyDates));
          if (!justifyDates && dateRange) children.push(metaParagraph(cfg, dateRange, twips(cfg.spacingPt.lineGap)));
          if (project.url) children.push(metaParagraph(cfg, project.url, twips(cfg.spacingPt.lineGap)));
          if (project.description) {
            children.push(
              new Paragraph({
                spacing: { after: twips(cfg.spacingPt.lineGap) },
                children: [new TextRun({ text: project.description, size: pt(cfg.fontSizePt.body), font: FONT })],
              })
            );
          }
          for (const bullet of project.bullets.filter(Boolean)) children.push(bulletParagraph(cfg, bullet));
        }
        break;
      }
      case "certifications": {
        if (data.certifications.length === 0) break;
        children.push(headingParagraph(cfg, "Certifications"));
        for (const cert of data.certifications) {
          const dateText = formatMonthYear(cert.date);
          const title = cert.issuer ? `${cert.name}, ${cert.issuer}` : cert.name;
          children.push(titleParagraph(cfg, title, dateText, justifyDates));
          if (!justifyDates && dateText) children.push(metaParagraph(cfg, dateText, twips(cfg.spacingPt.lineGap)));
          if (cert.url) children.push(metaParagraph(cfg, cert.url, twips(cfg.spacingPt.lineGap)));
        }
        break;
      }
      case "languages": {
        if (data.languages.length === 0) break;
        children.push(headingParagraph(cfg, data.templateId === "europass" ? "Language Skills" : "Languages"));
        if (data.templateId === "europass") {
          for (const lang of data.languages) {
            children.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: lang.language, bold: true, size: pt(cfg.fontSizePt.body), font: FONT })],
              })
            );
            if (lang.cefr) {
              children.push(buildCefrTable(cfg, lang.cefr));
            } else {
              children.push(metaParagraph(cfg, lang.proficiency, twips(cfg.spacingPt.itemGap)));
            }
          }
        } else {
          children.push(
            new Paragraph({
              spacing: { after: twips(cfg.spacingPt.lineGap) },
              children: [
                new TextRun({
                  text: data.languages.map((lang) => `${lang.language} (${lang.proficiency})`).join(", "),
                  size: pt(cfg.fontSizePt.body),
                  font: FONT,
                }),
              ],
            })
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

export async function renderDocxBuffer(data: ResumeData): Promise<Buffer> {
  const doc = buildDocx(data);
  return Packer.toBuffer(doc);
}
