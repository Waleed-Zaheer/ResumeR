import './globals.css';

import { Public_Sans } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TopLoader } from '@/components/ui/top-loader';
import { cn } from '@/lib/utils';

import type { Metadata } from "next";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

// Auth.js already treats NEXTAUTH_URL as this app's canonical production
// origin (see .env.local.example) - reused here so metadataBase/canonical
// URLs/sitemap/robots all agree with it instead of tracking a second env var.
const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const title = "ResumeForge — ATS-Friendly Resume Builder";
const description =
  "Build a polished, ATS-friendly resume in minutes. Live preview, multiple templates, instant PDF and DOCX export.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s — ResumeForge",
  },
  description,
  keywords: [
    "resume builder",
    "ATS-friendly resume",
    "ATS resume templates",
    "CV builder",
    "resume maker",
    "PDF resume",
    "DOCX resume",
  ],
  applicationName: "ResumeForge",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "ResumeForge",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  ...((process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION) && {
    verification: {
      ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
      ...(process.env.BING_SITE_VERIFICATION && {
        other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION },
      }),
    },
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", publicSans.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopLoader />
          <TooltipProvider delay={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
