import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/dbConnect";
import { Resume } from "@/models/Resume";
import { templateRegistry } from "@/components/resume/templates/template-registry";
import { toFileSlug } from "@/lib/resume/format";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  await dbConnect();
  const resume = await Resume.findOne({ _id: id, userId: session.user.id }).lean();
  if (!resume) {
    return new Response("Not found", { status: 404 });
  }

  const { Pdf } = templateRegistry[resume.data.templateId];
  const buffer = await renderToBuffer(<Pdf data={resume.data} />);
  const filename = `${toFileSlug(resume.data.personalInfo.fullName)}_Resume.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
