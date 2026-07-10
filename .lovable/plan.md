# HireEgypt — Hiring-as-a-Service Platform

A premium platform where candidates browse curated job offers (call center, sales, multilingual accounts), apply through offer-specific forms (CV + voice notes + structured data), and get auto-scored. You (admin) see a ranked shortlist per offer with CVs, voice notes, and scores. Candidates never see your phone number.

## Pages (public)

- **Home `/`** — hero, value prop ("Get hired faster"), featured offers, categories (English, Multilingual, Sales, Night Shift, WFH), how it works, CTA.
- **Offers `/offers`** — searchable/filterable grid: language, salary range, location, shift, experience level.
- **Offer detail `/offers/$slug`** — full JD (salary, location, shifts, benefits, requirements) + "Apply now" button.
- **Apply `/offers/$slug/apply`** — dedicated dynamic form per offer:
  - Basic info (name, phone, email, age, location, graduation status)
  - Offer-specific fields (English level self-rating, target language for multilingual roles, experience years, salary expectation, availability)
  - CV upload (PDF/DOC to Cloud Storage)
  - Voice note recorder (in-browser MediaRecorder → WAV upload; required for voice/call-center roles, English + second language when applicable)
  - Consent + submit
  - Success page with reference number
- **Study & Prep `/prep`** — curated resources page (English assessments, interview questions library, telemarketing Q&A, Speechace, YouTube prep videos, typing test, personality test, IQ test). Organized sections with cards + external links.
- **About / How it works `/how-it-works`**

## Admin (protected `/_authenticated/admin/*`)

Seeded admin: `elsayedshoeip70@gmail.com` / `12345786` (created via migration using Supabase Auth admin).

- **Dashboard `/admin`** — KPIs: total applicants, new today, per-offer counts, top-scored pending.
- **Offers `/admin/offers`** — list, create/edit/archive offers, view HR contact phone (private).
- **Applicants `/admin/applicants`** — filter by offer, status (new / shortlisted / rejected / hired), score range. Table with score, English/Comm/Experience breakdown.
- **Applicant detail `/admin/applicants/$id`** — full profile, CV preview/download, voice note playback, scores, notes, status change, WhatsApp deep-link to candidate (`https://wa.me/<candidate phone>`).

## Scoring engine

On submit, a server function computes:
- **English score** (0-10): self-rating + voice-note transcription confidence via Lovable AI (`openai/gpt-4o-mini-transcribe`) + LLM rubric scoring (`google/gemini-2.5-flash`) on transcript for fluency/clarity/grammar.
- **Communication** (0-10): LLM rubric on voice note (confidence, pacing, clarity).
- **Experience** (0-10): rubric on CV text (parsed via `pdf-parse` in server fn) + years field.
- **Total /30** stored on the application; ranking in admin is by total desc.

Runs async in the submit handler; UI shows "processing" until scored. Re-run button in admin.

## Backend (Lovable Cloud)

Tables (all with GRANTs + RLS):
- `offers` — title, slug, category, company, salary_text, location, shifts, benefits (jsonb), requirements (jsonb), form_schema (jsonb: which fields + which voice notes required), hr_phone (admin-only), status, created_at.
- `applications` — offer_id, full_name, email, phone, age, location, grad_status, answers (jsonb), cv_url, voice_notes (jsonb: [{lang, url, transcript}]), english_score, comm_score, exp_score, total_score, status, admin_notes, created_at.
- `user_roles` + `has_role()` (admin gate; separate table, security-definer function).
- `study_resources` — seeded from the prep list (title, category, url, description).

RLS:
- `offers` — public SELECT where `status='active'`; admin full.
- `applications` — public INSERT only; admin full SELECT/UPDATE. Candidates never read back others' data.
- `study_resources` — public SELECT; admin full.
- `user_roles` — authenticated SELECT own; admin manage.

Storage buckets:
- `cvs` (private) — signed URLs for admin.
- `voice-notes` (private) — signed URLs for admin.

Server functions:
- `submitApplication` (public) — validates with zod, stores row, kicks off scoring.
- `scoreApplication` (public, called by submit) — transcribe + LLM rubric.
- `getAdminApplications`, `updateApplicationStatus`, `createOffer`, `updateOffer` (`requireSupabaseAuth` + admin role check).
- `getSignedFileUrl` (admin) for CV/voice playback.

## Offers to seed (deduplicated)

LAUNCH Pad Customer Support, In-Source Nasr City, TaskUs Portuguese, IGT English Voice (Maadi), Alorica Retail (Zayed), Teleperformance Spanish (City Walk), IntouchCX Car Rental (Maadi), French Customer Service (Zayed), IGT Spanish Hotels (Maadi), Teleperformance English (New Cairo), Concentrix English CS, eClerx US Voice, US Travel Advisors (New Cairo Night), Concentrix B2/C1 multi-location, TTC Telesales (Nasr City), LTS Hotel Surveys (Nozha), Concentrix multi-language referrals, Dental Sales Night Shift (Heliopolis). ~18 unique offers.

HR phone `01012427403` (and the dental `Dm me`, TTC, etc.) stored only in `offers.hr_phone`, never rendered publicly.

## Design system

Premium, trust-forward, Egypt-tech aesthetic — NOT generic purple/indigo SaaS. Warm sand + deep teal + gold accent palette in `src/styles.css` (oklch tokens). Custom shadcn variants (hero button, offer card, score-pill). Serif display headings (via `<link>` in `__root.tsx`) + clean sans body. Micro-interactions on offer cards and voice recorder. Full RTL-ready copy stays English by default; Arabic-friendly typography.

## Tech notes (for reference)

- TanStack Start file routes; `_authenticated/admin/*` uses managed auth layout + role gate via `has_role('admin')` in a `beforeLoad` on `admin/route.tsx`.
- Voice recorder: Web Audio → WAV blob → upload via server fn returning signed upload URL, then insert application.
- Transcription/scoring inside `createServerFn` calling Lovable AI Gateway with `LOVABLE_API_KEY`.
- SEO: per-offer `head()` with title/description/og; sitemap includes all active offers.

## Out of scope (explicit)

- Candidate accounts / login (apply is anonymous by design; only admin logs in).
- WhatsApp inbound automation (candidates apply via forms; admin gets a `wa.me` deep link to reply).
- Payments / employer self-serve (single-admin ops for launch).

---

Ready to build the whole thing end-to-end in one pass. Confirm and I'll ship.