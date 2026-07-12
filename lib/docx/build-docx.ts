import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { ResumeData } from "@/lib/types/resume";
import { templateConfigs, type TemplateConfig } from "@/components/resume/templates/shared/template-config";
import { formatDateRange, formatMonthYear, sortExperienceDesc } from "@/lib/resume/format";

const FONT = "Calibri"; // docx cannot embed custom font files — Calibri is universally available and ATS-safe

function pt(fontSizePt: number) {
  return fontSizePt * 2; // docx `size` is in half-points — always go through this helper, never inline * 2
}

function twips(spacingPt: number) {
  return spacingPt * 20; // docx spacing is in twentieths of a point
}

function headingText(cfg: TemplateConfig, label: string) {
  return cfg.headingStyle === "uppercase" ? label.toUpperCase() : label;
}

function headingParagraph(cfg: TemplateConfig, label: string, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment,
    spacing: { before: twips(cfg.spacingPt.sectionGap), after: 60 },
    border:
      cfg.showAccentRule
        ? { bottom: { style: "single", size: 6, space: 2, color: "444444" } }
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

function bulletParagraph(cfg: TemplateConfig, bullet: string) {
  return new Paragraph({
    spacing: { after: twips(cfg.spacingPt.lineGap) },
    children: [new TextRun({ text: `• ${bullet}`, size: pt(cfg.fontSizePt.body), font: FONT })],
  });
}

function metaParagraph(cfg: TemplateConfig, text: string, spacingAfter = 0) {
  return new Paragraph({
    spacing: { after: spacingAfter },
    children: [new TextRun({ text, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" })],
  });
}

export function buildDocx(data: ResumeData): Document {
  const cfg = templateConfigs[data.templateId];
  const isExecutive = data.templateId === "executive";
  const headerAlignment = isExecutive ? AlignmentType.CENTER : undefined;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: headerAlignment,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: data.personalInfo.fullName, bold: true, size: pt(cfg.fontSizePt.name), font: FONT }),
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

  children.push(
    new Paragraph({
      alignment: headerAlignment,
      spacing: { after: data.links.length > 0 ? 20 : twips(cfg.spacingPt.sectionGap) },
      children: [
        new TextRun({ text: contactLine, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" }),
      ],
    })
  );

  if (data.links.length > 0) {
    children.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: twips(cfg.spacingPt.sectionGap) },
        children: [
          new TextRun({
            text: data.links.map((link) => `${link.label}: ${link.url}`).join("  |  "),
            size: pt(cfg.fontSizePt.meta),
            font: FONT,
            color: "444444",
          }),
        ],
      })
    );
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
          children.push(
            new Paragraph({
              spacing: { after: 20 },
              children: [
                new TextRun({
                  text: `${exp.company}${exp.role ? ` — ${exp.role}` : ""}`,
                  bold: true,
                  size: pt(cfg.fontSizePt.body),
                  font: FONT,
                }),
              ],
            })
          );
          const metaLine = [exp.location, formatDateRange(exp.startDate, exp.endDate, exp.current)]
            .filter(Boolean)
            .join("   ");
          if (metaLine) {
            children.push(metaParagraph(cfg, metaLine, twips(cfg.spacingPt.lineGap)));
          }
          for (const bullet of exp.bullets.filter(Boolean)) {
            children.push(bulletParagraph(cfg, bullet));
          }
        }
        break;
      }
      case "education": {
        if (data.education.length === 0) break;
        children.push(headingParagraph(cfg, "Education"));
        for (const edu of data.education) {
          children.push(
            new Paragraph({
              spacing: { after: 20 },
              children: [
                new TextRun({
                  text: `${edu.institution}${edu.degree ? ` — ${edu.degree}` : ""}`,
                  bold: true,
                  size: pt(cfg.fontSizePt.body),
                  font: FONT,
                }),
              ],
            })
          );
          const metaLine = [
            edu.fieldOfStudy,
            edu.location,
            formatDateRange(edu.startDate, edu.endDate, edu.current),
            edu.gpa ? `GPA: ${edu.gpa}` : "",
          ]
            .filter(Boolean)
            .join("   ");
          if (metaLine) {
            children.push(metaParagraph(cfg, metaLine, twips(cfg.spacingPt.lineGap)));
          }
          for (const bullet of edu.bullets.filter(Boolean)) {
            children.push(bulletParagraph(cfg, bullet));
          }
        }
        break;
      }
      case "skills": {
        if (data.skills.length === 0) break;
        children.push(headingParagraph(cfg, "Skills"));
        for (const group of data.skills) {
          if (group.items.length === 0) continue;
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
        break;
      }
      case "projects": {
        if (data.projects.length === 0) break;
        children.push(headingParagraph(cfg, "Projects"));
        for (const project of data.projects) {
          const dateRange = formatDateRange(project.startDate, project.endDate, false);
          children.push(
            new Paragraph({
              spacing: { after: 20 },
              children: [
                new TextRun({ text: project.name, bold: true, size: pt(cfg.fontSizePt.body), font: FONT }),
                ...(dateRange
                  ? [new TextRun({ text: `   ${dateRange}`, size: pt(cfg.fontSizePt.meta), font: FONT, color: "444444" })]
                  : []),
              ],
            })
          );
          if (project.url) {
            children.push(metaParagraph(cfg, project.url, twips(cfg.spacingPt.lineGap)));
          }
          if (project.description) {
            children.push(
              new Paragraph({
                spacing: { after: twips(cfg.spacingPt.lineGap) },
                children: [
                  new TextRun({ text: project.description, size: pt(cfg.fontSizePt.body), font: FONT }),
                ],
              })
            );
          }
          for (const bullet of project.bullets.filter(Boolean)) {
            children.push(bulletParagraph(cfg, bullet));
          }
        }
        break;
      }
      case "certifications": {
        if (data.certifications.length === 0) break;
        children.push(headingParagraph(cfg, "Certifications"));
        for (const cert of data.certifications) {
          const dateText = formatMonthYear(cert.date);
          children.push(
            new Paragraph({
              spacing: { after: cert.url ? 20 : twips(cfg.spacingPt.lineGap) },
              children: [
                new TextRun({
                  text: `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ""}${dateText ? ` (${dateText})` : ""}`,
                  size: pt(cfg.fontSizePt.body),
                  font: FONT,
                }),
              ],
            })
          );
          if (cert.url) {
            children.push(metaParagraph(cfg, cert.url, twips(cfg.spacingPt.lineGap)));
          }
        }
        break;
      }
      case "languages": {
        if (data.languages.length === 0) break;
        children.push(headingParagraph(cfg, "Languages"));
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

// Referenced for potential future use of Word outline heading styles; kept to
// match the documented import surface for this module.
void HeadingLevel;
