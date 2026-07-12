import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/dbConnect";
import { Resume } from "@/models/Resume";
import { ResumeStoreProvider } from "@/store/resume-store";
import { BuilderShell } from "@/components/builder/builder-shell";
import type { ResumeData } from "@/lib/types/resume";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { resumeId } = await params;

  await dbConnect();
  const resume = await Resume.findOne({ _id: resumeId, userId: session.user.id }).lean();
  if (!resume) notFound();

  // Guarantee a plain, JSON-serializable object before it crosses into the
  // client store (strips any stray ObjectId/Date that could sneak in).
  const initialData: ResumeData = JSON.parse(JSON.stringify(resume.data));

  return (
    <ResumeStoreProvider initial={initialData}>
      <BuilderShell resumeId={resumeId} title={resume.title} />
    </ResumeStoreProvider>
  );
}
