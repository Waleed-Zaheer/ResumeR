import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createEmptyResumeData } from "@/lib/validations/resume";
import { ResumeStoreProvider } from "@/store/resume-store";
import { BuilderShell } from "@/components/builder/builder-shell";

export default async function BuilderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // No server-side resume storage: the draft lives only in the browser
  // (localStorage, via the Zustand store's persist middleware). This is
  // just the empty-state fallback for a first visit or a cleared draft.
  return (
    <ResumeStoreProvider initial={createEmptyResumeData()}>
      <BuilderShell />
    </ResumeStoreProvider>
  );
}
