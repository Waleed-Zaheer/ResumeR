import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createEmptyResumeData } from "@/lib/validations/resume";
import { ResumeStoreProvider } from "@/store/resume-store";
import { BuilderShell } from "@/components/builder/builder-shell";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Which resume to edit is chosen on the dashboard (it creates the
  // localStorage entry, then links here with its id) — there's nothing
  // sensible to build without one.
  const { id } = await searchParams;
  if (!id) redirect("/dashboard");

  // No server-side resume storage: the draft lives only in the browser
  // (localStorage, via the Zustand store's persist middleware, keyed by
  // `id`). This is just the empty-state fallback before hydration reads
  // whatever's already saved for this resume.
  return (
    <ResumeStoreProvider initial={createEmptyResumeData()} resumeId={id}>
      <BuilderShell resumeId={id} />
    </ResumeStoreProvider>
  );
}
