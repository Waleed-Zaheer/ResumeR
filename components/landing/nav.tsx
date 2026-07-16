"use client";

import { Menu, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { ResumeForgeMark } from '@/components/brand/resume-forge-mark';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#templates", label: "Templates" },
];

const noopSubscribe = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only knows the real theme after hydration; useSyncExternalStore
  // lets us flip from the SSR default to the client value without a setState-in-effect.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    getMountedSnapshot,
    getMountedServerSnapshot,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function MarketingNav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-lg font-semibold tracking-tight text-foreground"
        >
          <ResumeForgeMark size={22} className="shrink-0 text-primary" />
          <p className="gap-0.5 flex">
            <span>Resume</span>
            <span className="text-primary">Forge</span>
          </p>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Log in
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button nativeButton={false} render={<Link href="/signup" />}>
              Get Started
            </Button>
          </motion.div>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu" />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {navLinks.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={<a href={link.href} />}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-2 p-4">
                <SheetClose
                  render={<Link href="/login" />}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-9 w-full",
                  )}
                >
                  Log in
                </SheetClose>
                <SheetClose
                  render={<Link href="/signup" />}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-9 w-full",
                  )}
                >
                  Get Started
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
