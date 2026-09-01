import { auth } from "@/auth";
import { resumeDataSchema } from "@/lib/validations/resume";
import { renderDocxBuffer } from "@/lib/docx/build-docx";
import { toFileSlug } from "@/lib/resume/format";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Stateless export: resumes are never persisted server-side, so the full
 * resume payload travels with the request instead of being loaded by ID.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Your session expired. Please log in again." }, { status: 401 });
  }

  const { allowed } = await checkRateLimit({ key: `export-docx:${session.user.id}`, limit: 20, windowMs: 10 * 60 * 1000 });
  if (!allowed) {
    return Response.json({ error: "Too many export requests. Please wait a few minutes and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = resumeDataSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: `Invalid resume data — ${issue?.path.join(".") || "field"}: ${issue?.message ?? "invalid value"}` },
      { status: 400 }
    );
  }

  const data = parsed.data;

  let buffer: Buffer;
  try {
    buffer = await renderDocxBuffer(data);
  } catch (error) {
    console.error("DOCX export failed", error);
    return Response.json({ error: "Failed to generate the DOCX. Please try again." }, { status: 500 });
  }

  const filename = `${toFileSlug(data.personalInfo.fullName)}_Resume.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
