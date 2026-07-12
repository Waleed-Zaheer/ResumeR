import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} ResumeForge. All rights reserved.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#templates" className="transition-colors hover:text-foreground">
            Templates
          </a>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
          <span className="cursor-default transition-colors hover:text-foreground">Privacy</span>
          <span className="cursor-default transition-colors hover:text-foreground">Terms</span>
        </nav>
      </div>
    </footer>
  );
}
