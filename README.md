# ResumeForge

An ATS-friendly resume/CV builder built with Next.js 16, TypeScript, MongoDB, and Auth.js.
Live preview, four ATS-safe templates, and one-click PDF/DOCX export.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui ("new-york"-style, Base UI primitives), amber/gold theme with full light/dark support
- **Landing page animation:** react-three-fiber (3D hero), GSAP + ScrollTrigger (scroll reveals), Motion (micro-interactions)
- **Database:** MongoDB via Mongoose
- **Auth:** Auth.js v5 (Credentials, optional Google OAuth), JWT sessions
- **State:** Zustand (per-resume store) + react-hook-form + Zod
- **Export:** `@react-pdf/renderer` (PDF) and `docx` (DOCX), both driven from one canonical `ResumeData` model

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill in real values:

   ```bash
   cp .env.local.example .env.local
   ```

   - `MONGODB_URI` — a MongoDB connection string (local `mongodb://127.0.0.1:27017/ai-resume-builder`, or an Atlas URI).
   - `AUTH_SECRET` — generate one with `npx auth secret` (or any random 32+ byte base64 string).
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — optional. Leave blank to disable Google sign-in; only Credentials (email/password) will show.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `app/(marketing)` — public landing page
- `app/(auth)` — login/signup
- `app/(app)` — gated dashboard + resume builder (requires auth)
- `app/api/resumes/[id]/export/{pdf,docx}` — export routes (Node runtime)
- `components/resume/templates` — the 4 ATS-safe templates, each with a DOM (Tailwind) version for live preview and a matching `@react-pdf/renderer` version for export, sharing layout numbers from `shared/template-config.ts`
- `lib/validations/resume.ts` — the canonical Zod schema (`ResumeData`) used everywhere: the Zustand store, form validation, both template renderers, and the DOCX generator
- `models/` — Mongoose models (`User`, `Resume`)
- `auth.ts` / `auth.config.ts` / `proxy.ts` — Auth.js v5 config (Next 16 renamed Middleware to Proxy)

## ATS-compliance notes

Every template is strictly single-column and text-only: no tables, images, icons, or graphical skill bars, real semantic headings, standard bullet characters, and consistent date formatting shared across the live preview, PDF, and DOCX renderers. DOCX uses Calibri (docx can't embed custom fonts, so a universally-available font avoids silent substitution); PDF uses the built-in Helvetica family (always present in any PDF reader/ATS parser, no font embedding needed).

## Deploying

Any Vercel-compatible host works — the PDF/DOCX export routes are pure JS (no headless Chromium) and run as ordinary Node serverless functions (`export const runtime = "nodejs"`). Set the same environment variables from `.env.local.example` in your hosting provider's dashboard.
