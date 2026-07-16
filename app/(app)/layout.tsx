import Link from "next/link";
import type { Metadata } from "next";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

// Dashboard/builder are private, per-account screens with no unique public
// content - keep them out of search results even though robots.ts/sitemap.ts
// already steer crawlers away.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-8xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight"
          >
            ResumeForge
          </Link>
          <div className="flex items-center gap-4">
            {session?.user?.email && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.email}
              </span>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
