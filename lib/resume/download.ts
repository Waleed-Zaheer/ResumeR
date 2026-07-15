import { resumeDataSchema } from "@/lib/validations/resume";
import type { ResumeData } from "@/lib/types/resume";
import { toFileSlug } from "@/lib/resume/format";

export type ExportFormat = "pdf" | "docx";

export class ResumeExportError extends Error {}

const EXPORT_META: Record<ExportFormat, { path: string; extension: string }> = {
  pdf: { path: "/api/resumes/export/pdf", extension: "pdf" },
  docx: { path: "/api/resumes/export/docx", extension: "docx" },
};

/**
 * Validates the in-memory resume draft, POSTs it to the stateless export
 * route, and triggers a browser download. Resumes are never persisted
 * server-side, so the full data payload has to travel with every export
 * request instead of being looked up by ID.
 */
export async function downloadResumeExport(data: ResumeData, format: ExportFormat): Promise<void> {
  const parsed = resumeDataSchema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const location = firstIssue?.path.join(".") || "resume data";
    throw new ResumeExportError(`${location}: ${firstIssue?.message ?? "invalid value"}`);
  }

  const { path, extension } = EXPORT_META[format];

  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    throw new ResumeExportError("Couldn't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new ResumeExportError("Your session expired. Please log in again.");
    }
    let message = `Export failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Response wasn't JSON — keep the generic status-based message.
    }
    throw new ResumeExportError(message);
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    throw new ResumeExportError("Received an empty or corrupted file. Please try again.");
  }

  const filename = `${toFileSlug(parsed.data.personalInfo.fullName)}_Resume.${extension}`;
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
