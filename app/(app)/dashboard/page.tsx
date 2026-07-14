import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NewResumeButton } from "@/components/dashboard/new-resume-button";
import { ResumeGrid, ResumeListItem } from "@/components/dashboard/resume-grid";
import { dbConnect } from "@/lib/db/dbConnect";
import { Resume } from "@/models/Resume";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await dbConnect();

  const resumes = await Resume.find({ userId: session.user.id })
    .sort({ updatedAt: -1 })
    .lean();

  const items: ResumeListItem[] = resumes.map((resume) => ({
    id: String(resume._id),
    title: resume.title,
    templateId: resume.data?.templateId ?? "minimal",
    fullName: resume.data?.personalInfo?.fullName ?? "",
    jobTitle: resume.data?.personalInfo?.jobTitle ?? "",
    updatedAt: new Date(resume.updatedAt).toISOString(),
  }));

  return (
    <div className="mx-auto max-w-8xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Your Resumes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, and export ATS-friendly resumes.
          </p>
        </div>
        {items.length > 0 && <NewResumeButton />}
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-7" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-medium">
              No resumes yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              You haven&apos;t created any resumes. Start building your first
              ATS-optimized resume in seconds.
            </p>
            <NewResumeButton className="mt-6" />
          </div>
        ) : (
          <ResumeGrid resumes={items} />
        )}
      </div>
    </div>
  );
}
