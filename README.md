# ResumeForge

An ATS-friendly resume/CV builder. Live preview, five ATS-safe templates, and one-click
PDF/DOCX export — built on Next.js 16, TypeScript, MongoDB, and Auth.js v5.

---

## What it does

You sign up, fill in a form, watch the resume render live beside it, and export a PDF or
DOCX. The whole product is aimed at one constraint: **the output has to survive an Applicant
Tracking System**, which is why the templates look plainer than a design-led builder's.

---

## Architecture

The unusual decision at the centre of this app: **resumes are never stored on the server.**

```text
 Browser                                         Server
 ─────────────────────────────────────────       ─────────────────────────────────
 Zustand store  ──persist──▶ localStorage        MongoDB
 (canonical ResumeData)      "resumeforge:        └─ users only
        │                     draft:v1"              (email, passwordHash, profile)
        │
        │  live preview
        ├────────────▶ templates/dom/*.tsx  (Tailwind DOM render)
        │
        │  export: POST the whole resume payload
        └────────────▶ /api/resumes/export/pdf  ──▶ templates/pdf/*  ──▶ PDF buffer
                       /api/resumes/export/docx ──▶ lib/docx/build-docx ──▶ .docx
                       (auth-gated, but stateless — nothing is read from a database)
```

MongoDB holds **only the `User` collection**. There is no `Resume` model. The export routes
are auth-gated but stateless: the client sends the full resume in the request body, the
server validates it against the Zod schema and renders it, and nothing is persisted. The PDF
route says so in its own comment — *"resumes are never persisted server-side, so the full
resume payload travels with the request instead of being loaded by ID."*

**What this buys:** no resume data at rest, so no privacy surface around people's employment
history; exports scale as pure stateless functions; no sync or migration logic.

**What it costs:** your resume lives in one browser. Clear site data, switch to your phone,
or open a private window and it's gone. There is no resume list, no versioning, and no
recovery. This is the single most consequential thing to understand about the app — see
[REQUIRED.md](./REQUIRED.md) §3.

### One schema drives everything

`lib/validations/resume.ts` defines `ResumeData` as a Zod schema, and it is the single source
of truth for the Zustand store, react-hook-form validation, the DOM preview templates, the
PDF templates, the DOCX builder, and the export API's request validation. Add a field once
and every renderer sees the same shape.

### Two renderers per template, kept in sync by shared numbers

Each template exists twice — a Tailwind DOM version for the live preview, and a
`@react-pdf/renderer` version for export. They can't share code (different rendering
targets), so they share **layout constants** from
`components/resume/templates/shared/template-config.ts`. That's what stops the preview and
the exported PDF from drifting apart.

### ATS compliance is a design constraint, not a style

Every template is strictly single-column and text-only: no tables, images, icons, or
graphical skill bars; real semantic headings; standard bullet characters; consistent date
formatting across all three renderers.

Font choices follow from the same constraint: DOCX uses **Calibri** because `docx` cannot
embed custom fonts and a universally-available font avoids silent substitution; PDF uses the
built-in **Helvetica** family, which is present in every PDF reader and parser with no
embedding required.

### Auth

Auth.js v5 with JWT sessions. Credentials (email + password, bcrypt) always available;
Google OAuth is optional and the button only appears if `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`
are set. Note that Next 16 renamed Middleware to Proxy — hence `proxy.ts` rather than
`middleware.ts`.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui ("new-york", Base UI primitives), amber/gold theme, light/dark |
| Database | MongoDB via Mongoose — **users only** |
| Auth | Auth.js v5 (Credentials + optional Google), JWT sessions |
| State | Zustand (persisted to `localStorage`) + react-hook-form + Zod |
| Export | `@react-pdf/renderer` (PDF), `docx` (DOCX) |
| Editor UX | `@dnd-kit` for reordering sections |
| Landing page | react-three-fiber (3D hero), GSAP + ScrollTrigger, Motion |

No headless Chromium anywhere — both exporters are pure JS, so they run as ordinary Node
serverless functions.

---

## Templates

Five, all ATS-safe: `minimal`, `modern`, `compact`, `executive`, `europass`. Registered in
`components/resume/templates/template-registry.ts`.

---

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in MONGODB_URI and AUTH_SECRET
npm run dev
```

Open <http://localhost:3000>. See [REQUIRED.md](./REQUIRED.md) for what each variable does
and how to obtain it.

---

## Project structure

```text
app/
  (marketing)/        — public landing page
  (auth)/             — login / signup
  (app)/              — gated dashboard + builder
  api/
    auth/[...nextauth]/    — Auth.js handler
    resumes/export/pdf/    — stateless PDF export (Node runtime)
    resumes/export/docx/   — stateless DOCX export (Node runtime)
  icon.tsx, apple-icon.tsx, opengraph-image.tsx, robots.ts, sitemap.ts
components/
  resume/templates/
    dom/                — Tailwind preview renderers (5 templates)
    pdf/                — @react-pdf/renderer counterparts
    shared/             — layout constants shared by both
    template-registry.ts
lib/
  validations/resume.ts — canonical ResumeData Zod schema (source of truth)
  docx/build-docx.ts    — DOCX generator
  db/dbConnect.ts       — Mongoose connection
  actions/auth-actions.ts
  primitives/           — local UI primitive hooks
models/User.ts          — the only Mongoose model
store/resume-store.ts   — Zustand + localStorage persistence
auth.ts, auth.config.ts, proxy.ts
```

---

## Deploying

Any Vercel-compatible host. The export routes are pure JS (`export const runtime = "nodejs"`)
with no Chromium dependency. Set the same variables from `.env.local.example` in your host's
dashboard — see [REQUIRED.md](./REQUIRED.md).
