# BWAT.md

This file provides guidance to Bwat when working with code in this repository.

## Tech Stack
- **Framework**: Next.js 16 (App Router) with `--turbo` dev mode
- **Language**: TypeScript 6, React 19
- **Database ORM**: Prisma 5.22.0 + PostgreSQL (Supabase with pgBouncer)
- **CSS framework**: Tailwind CSS v4 (CSS-first — no `tailwind.config.*` file)
- **Icons**: lucide-react 0.474
- **Auth**: Client-side session (localStorage/sessionStorage), bcryptjs for password hashing
- **Email**: Resend
- **Fonts**: Geist / Geist Mono (via `next/font/google`)

## Brand Identity
**Colors** (from existing usage; Tailwind v4 CSS-first, no token file):
- Primary: `green-800` (`#166534`) — buttons, header bars, brand elements
- Secondary: `red-600` (`#dc2626`) — motto accent, urgent indicators
- Background / surface: `white` / `bg-gradient-to-b from-[#eaf5ee] to-white`
- Foreground / text: `text-gray-500` / `text-green-800` / `text-white`
- Border / muted: `border-green-800` / `shadow-md`
- Success: `green-50` hover states

**Typography**:
- Display / heading: `"Geist", sans-serif` (via `--font-geist-sans`)
- Body: `"Geist", sans-serif`
- Mono: `"Geist Mono", monospace` (via `--font-geist-mono`)

**Geometry**:
- Border radius: `rounded-2xl` (1rem) on cards and buttons
- Spacing scale: default Tailwind v4 scale
- Shadow: `shadow-md` / `shadow-xl` for depth

**Visual language**: Medical-professional — green primary, generous whitespace, sharp text rendering (font-smoothing disabled for Windows), rounded cards, clean minimal layout.

## Coding Conventions
- **Client components**: Every interactive page/component starts with `"use client"`.
- **API routes**: Export named `GET`/`POST`/`PUT`/`DELETE` functions, return `NextResponse.json()`, wrap in try/catch returning `{ error: err.message }` on failure.
- **Prisma**: Use global singleton from `@/app/lib/prisma` — never instantiate `PrismaClient` directly.
- **Imports**: Use `@/` path alias (from `tsconfig.json` paths). Group: React imports first, then lucide-react, then local components/libs.
- **Interfaces**: Define at module level, above the component, without `I` prefix (e.g. `Patient`, `BillLine`). Use `type` for unions.
- **Session auth**: Read user via `localStorage.getItem("user") || sessionStorage.getItem("user")`, parse JSON, redirect if missing/wrong role. Save to localStorage if `rememberMe`, sessionStorage otherwise. Clear the other storage before saving.
- **Role-based routing**: Use `ROLE_ROUTES` from `@/app/lib/roleRoutes` for post-login redirect.
- **Patient numbering**: `MSMC-{year}-{random 5-digit}` generated in the POST handler.
- **API auth**: API routes do NOT do server-side session validation — they trust client-side storage. Do not add server auth checks without explicit request.
- **No shadcn/ui**: All UI components are custom — do not introduce shadcn or other component libraries without explicit request.
- **Staff ↔ User 1:1**: Every `User` has exactly one `Staff` record (linked by `userId`). The `Staff` record holds the department and specialization. Use `Staff.fullName` for display names, `Staff.department` for department-based filtering.
- **Role enum nuance**: The Prisma `Role` enum has `NURSE`, `MIDWIFE`, and `NURSE_MIDWIFE` as separate values — be careful which one is used in user creation. `ROLE_ROUTES` does NOT have entries for bare `NURSE` or `MIDWIFE`; only `NURSE_MIDWIFE` gets a route (`/nurse_midwife`).

## Architecture Notes
**App Router structure**: `app/` has role-specific pages at top level (`/receptionist`, `/Doctors`, `/laboratory`, `/pharmacy`, `/Dentist`, `/nurse_midwife`, `/radiologist_sonographer`, `/dashboard` (admin), `/cleaner`). Layout in `app/layout.tsx` sets Geist fonts and `h-full antialiased` classes. Shared components live in `app/components/`. API routes live in `app/api/*/route.ts`.

**Patient flow**: Reception registers patient → triage → consultation (doctor/nurse) → lab/imaging/pharmacy → cashier → discharge. Status is tracked via `Patient.currentStatus` enum (`PatientStatus`). Timeline entries are logged via `PatientTimeline`.

**Database**: Supabase PostgreSQL with pgBouncer. Two connection URLs: `DATABASE_URL` (with `?pgbouncer=true&connection_limit=1&pool_timeout=20`) for transactional queries, `DIRECT_URL` (without pgBouncer) for migrations. Prisma is bundled as a server external package (`serverExternalPackages: ["@prisma/client"]` in next.config.ts).

## Commands
- `npm run dev` — starts Next.js dev server with `--turbo`
- `npm run build` — runs `prisma generate && next build`
- `npm run lint` — ESLint check
- `npx prisma migrate dev` — run migrations against `DIRECT_URL` (not `DATABASE_URL`; pgBouncer doesn't support DDL)

## Gotchas
- **Next.js 16 is breaking**: This is NOT the Next.js you know. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any code that touches Next.js APIs. Heed deprecation notices.
- **Tailwind v4**: CSS-first configuration — there is NO `tailwind.config.js` or `tailwind.config.ts`. Color tokens are used as Tailwind class names (e.g. `green-800`), not custom CSS vars. Do not look for or create a tailwind config file.
- **Font smoothing disabled** globally in `globals.css` for Windows rendering sharpness (`-webkit-font-smoothing: none !important;`). Do not remove or override.
- **pgBouncer + Prisma**: Always use `DATABASE_URL` (with pgBouncer params) for queries and `DIRECT_URL` (without pgBouncer) for migrations. The `prisma.ts` singleton uses `DATABASE_URL` via the datasource config. The `prisma/schema.prisma` lists both env vars.
- **No server-side auth**: API routes do not validate user sessions. The client sends the user object in the request body/headers. Adding server-side auth checks is possible but requires explicit direction.
- **Admin-only dashboard**: `/dashboard` is only accessible to users with role `ADMINISTRATOR`. All other roles redirect to their own page. The `heartbeat` API system tracks online users via POST + 2-minute polling.
- **Print styles**: The global CSS has a `.print-area` class-based print system with a watermark logo overlay — use `class="print-area"` on elements the user should be able to print.
- **Session persistence**: `rememberMe` → localStorage; otherwise → sessionStorage. Always clear the other storage before writing to avoid stale data across logins.
- **Lab test catalog**: Single source of truth at `@/app/lib/labTestCatalog.ts`. Do not duplicate test definitions — import from there. Tests have `defaultPrice` (0 = needs manual pricing via `needsPricing` flag).
- **RESEND_API_KEY required**: Email notifications (lab results, etc.) require `RESEND_API_KEY` in `.env`. The sender is hardcoded as `notifications@mainstreetemr.com`. The `resend` package is dynamically imported — the feature degrades silently if the key is missing.
- **CASHIER route `/billing`**: The `ROLE_ROUTES` maps `CASHIER` to `/billing`, but there is no `app/billing/` page directory. The billing UI lives within the cashier flow via client-side routing or modal-based components. If adding a standalone billing page, create `app/billing/page.tsx`.
- **Prisma enum values for patient status**: The `PatientStatus` enum has 13 values including `REGISTERED`, `AWAITING_TRIAGE`, `AWAITING_DOCTOR`, `AWAITING_DENTIST`, `AWAITING_SONOGRAPHY`, `AWAITING_RADIOLOGY`, `AWAITING_LAB`, `IN_CONSULTATION`, `AWAITING_PHARMACY`, `AWAITING_CASHIER`, `ADMITTED`, `DISCHARGED`, `LAB_REJECTED`. Use these exact strings when filtering or updating patient status.
