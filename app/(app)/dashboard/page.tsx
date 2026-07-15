import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NewResumeButton } from "@/components/dashboard/new-resume-button";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="size-7" />
        </div>
        <h1 className="mt-4 font-heading text-lg font-medium">
          Welcome{session.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your resume is built and exported in this browser only — we don&apos;t store your CV
          content on our servers. Pick up your draft below, or start a fresh one.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/builder">
            <Button variant="outline">Continue Building</Button>
          </Link>
          <NewResumeButton />
        </div>
      </div>
    </div>
  );
}
