# Resume Studio

A full-stack resume builder: Google sign-in, multiple private resumes, autosave,
four templates, an ATS checker and job-description matcher, a live A4 preview,
and text-based PDF export that applicant tracking systems can actually read.

Built with Next.js 15 (App Router), TypeScript, PostgreSQL, Prisma, NextAuth v5,
Material UI, and Tailwind CSS.

## Features

**Editing**

- Live A4 preview with Classic, ATS safe, Compact, and Two-column templates
- Summary, personal details, experience, projects, education, skills, and
  certifications
- Bullet editor (add, reorder, remove achievements) with Enter-to-add
- Chip-based skills and spoken languages
- "Currently work/study here" handling, rendered as “Present”
- Autosave for existing resumes, plus Ctrl/⌘ + S and an unsaved-changes guard
- Duplicate-safe entry ids, undoable delete, and a resume switcher that warns
  before discarding edits

**ATS and job matching**

- ATS check dialog with a 0–100 readiness score and pass/improve/fix checks for
  contact details, summary, dates, action verbs, measurable results, skills,
  layout, and length
- Paste a job description to extract its keywords and see which ones your resume
  already covers
- Add missing keywords to the correct skills group with one click (or all at once)
- One-click switch to the ATS safe template: single column, black text, no
  graphics or shaded chips, and plain comma-separated skills for reliable parsing

**Export**

- Print / Save as PDF with real selectable text, clickable links, and exact A4
  sizing. No rasterised DOM snapshots.
- Safe, name-based PDF file names

**Accounts and sharing**

- Google sign-in; every resume is scoped to its owner
- Optional read-only public link (`/r/[slug]`) you can toggle per resume
- Export all of your data as JSON, or permanently delete your account
- Optimistic concurrency: a second tab cannot silently overwrite a newer save

**Engineering**

- Zod-validated request bodies and a shared API error envelope
- Soft deletes, rate limiting, boot-time environment validation, and pagination
- Edge middleware gate plus server-side session checks in every route
- Unit tests for date formatting, the resume schema, and the editor reducer
- GitHub Actions CI: lint, typecheck, test, build

## Requirements

- Node.js 20.9 or newer
- PostgreSQL 14 or newer

## Local setup

1. Install dependencies (this also generates Prisma Client):

   ```bash
   npm install
   ```

2. Create a PostgreSQL database. Neon works well; for a local database create a
   database for the app.

3. In the [Google Cloud Console](https://console.cloud.google.com/), create an
   OAuth client ID for a web application and add
   `http://localhost:3000/api/auth/callback/google` as an authorized redirect
   URI.

4. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
   AUTH_SECRET="<random 32-byte base64 string>"
   AUTH_GOOGLE_ID="<oauth client id>"
   AUTH_GOOGLE_SECRET="<oauth client secret>"
   ```

   Generate a secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. Apply the committed migrations:

   ```bash
   npm run db:deploy
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply committed migrations (deployments) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run postinstall` | Generate Prisma Client (runs automatically) |

## Architecture

```text
src/
  app/
    page.tsx                    signed-in builder shell
    login/                      Google sign-in
    r/[slug]/                   public, read-only shared resume
    api/resumes/                list, create, read, update, soft delete
    api/resumes/[id]/share/     public-link toggle
    api/resumes/[id]/restore/   undo a delete
    api/account/                account deletion and data export
  components/
    Builder.tsx                 orchestration: dialogs, print, sharing, undo
    builder/                    top bar, switcher, editor and preview panels
    editor/                     section forms, bullets, tags, template picker
    preview/                    A4 document renderer and responsive scaler
  hooks/useResumeEditor.ts      list state, autosave, dirty tracking, conflicts
  lib/                          auth, Prisma, API helpers, schemas, ATS logic, reducer
```

**Data model.** A resume is a row (`title`, owner, visibility, timestamps) plus
a validated JSON document (`data`). Sections are normalised in code with
`schemaVersion`, so the stored JSON can evolve without a table migration. Every
read goes through `normalizeResumeData`, which upgrades legacy documents
(missing ids, no `summary`, date strings) on the fly.

**PDF strategy.** The resume is rendered once as real HTML and printed through
the browser’s print pipeline using `@page { size: A4; margin: 0 }`. The app
chrome is hidden with print-only CSS, so the output keeps selectable text,
working hyperlinks, and ATS-readable content. This avoids DOM-to-image
libraries and their colour-parsing workarounds.

**Autosave and conflicts.** Edits are debounced for 1.2s, then sent with the
`updatedAt` the client last saw. The API only updates when that timestamp still
matches; otherwise it returns `409` and the UI surfaces the conflict instead of
overwriting a newer version from another tab.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Random secret, at least 16 characters |
| `AUTH_GOOGLE_ID` | yes | Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | yes | Google OAuth client secret |
| `AUTH_TRUST_HOST` | no | Set to `true` behind a proxy |

`src/instrumentation.ts` validates these once at server boot so a misconfigured
deployment fails fast instead of on the first request.

## Deployment

1. Provision PostgreSQL (for example Neon) and set the four required variables
   in your host.
2. Add `https://your-domain.com/api/auth/callback/google` to the Google OAuth
   client.
3. Run `npm run db:deploy` as a release command (not as part of the build), then
   `npm run build && npm run start` or let Vercel handle the build.
4. `npm install` runs `prisma generate` automatically, so fresh clones and CI
   do not need a manual step.

## Testing

```bash
npm test
```

Unit tests cover month formatting without timezone drift, resume JSON
normalisation and validation, the editor reducer (add/remove/reorder), and the
ATS score, keyword extraction, and keyword matching logic. CI runs lint,
typecheck, tests, and a production build on every push and pull request.

## Privacy

Resume Studio stores your name, email, and the resumes you create. Signed-in
users can download everything as JSON (`Account → Export my data`) or delete the
account and all resumes permanently (`Account → Delete account`). Public links
are opt-in per resume and can be turned off at any time.
