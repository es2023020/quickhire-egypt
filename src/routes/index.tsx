import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  ArrowRight, CheckCircle2, Mic, FileCheck, Users2, Sparkles,
  Zap, TrendingUp, Phone, Headphones, Star, MessageSquare, Upload,
  ChevronRight, Clock, Shield
} from "lucide-react";
import { listOffers } from "@/lib/offers.functions";
import { OfferCard } from "@/components/offer-card";

const offersQO = queryOptions({
  queryKey: ["offers", "public"],
  queryFn: () => listOffers(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(offersQO),
  component: Home,
});

const ROLE_CATEGORIES = [
  {
    icon: TrendingUp,
    title: "Sales Representatives",
    desc: "B2B and B2C direct sales roles across leading Egyptian enterprises",
  },
  {
    icon: Phone,
    title: "Cold Callers & SDRs",
    desc: "Outbound prospecting, international outreach & pipeline generation",
  },
  {
    icon: Headphones,
    title: "Call Center Specialists",
    desc: "Inbound & outbound multilingual customer and support accounts",
  },
  {
    icon: MessageSquare,
    title: "Customer Support Reps",
    desc: "Omnichannel customer resolution, retention and relationship building",
  },
  {
    icon: Users2,
    title: "Account Executives",
    desc: "Enterprise closing, client relationships and revenue acceleration",
  },
  {
    icon: Zap,
    title: "Business Development",
    desc: "Strategic partner acquisition, commercial expansion and new ventures",
  },
];

const TESTIMONIALS = [
  {
    name: "Ahmed Khaled",
    role: "Sales Representative at Vodafone",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
    text: "Applied on Monday, recorded my voice pitch, had an interview on Wednesday, and signed an offer the next week. QuickHire cuts out all the recruiter runaround.",
    score: "28/30",
  },
  {
    name: "Nour Mahmoud",
    role: "Call Center Agent at Teleperformance",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
    text: "The voice recording feature made me stand out immediately. HR told me they could verify my English fluency before the first screening call.",
    score: "26/30",
  },
  {
    name: "Omar Samir",
    role: "SDR at Flat6Labs",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80",
    text: "Finally a platform built for Egypt with real companies and real salary packages. Zero ghost listings, fast updates, and direct hiring manager contact.",
    score: "30/30",
  },
];

function Home() {
  const { data: offers } = useSuspenseQuery(offersQO);
  const featured = offers.filter((o) => o.featured).slice(0, 6);
  const showcase = featured.length ? featured : offers.slice(0, 6);

  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* ── HERO SECTION (Generous Dark Space + Neon Glow Accent) ── */}
      <section className="relative overflow-hidden bg-hero py-24 md:py-36 border-b border-white/[0.06]">
        {/* Subtle grid pattern & obsidian radial background */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:4rem_4rem] pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/[0.07] blur-[120px] pointer-events-none" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-12 md:px-8">
          <div className="md:col-span-7 space-y-8">
            {/* Top pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-4 py-1.5 text-xs font-semibold text-zinc-300 shadow-lg">
              <Sparkles className="size-3.5 text-primary" />
              <span>Egypt's #1 Sales & Call Center Hiring Platform</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
              Get hired in sales &amp; call center.
            </h1>

            <p className="max-w-xl text-lg md:text-xl text-[#E4E4E7]/90 leading-relaxed font-normal">
              Apply once with your CV and a 60-second voice note. Our AI engine scores your fluency and communication, connecting you directly with hiring teams across Egypt.
            </p>

            {/* Actionable Visual Guide: 1 Primary Lime Green CTA per view */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/offers"
                className="group inline-flex items-center gap-3 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_25px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all duration-200"
              >
                <span>Browse Open Jobs</span>
                <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-4 text-base font-semibold text-white shadow-sm hover:border-white/30 hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-200"
              >
                How It Works
              </Link>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-6 max-w-md border-t border-white/10 pt-8">
              {[
                { k: "+50", v: "Live Roles" },
                { k: "24h", v: "Avg. Feedback" },
                { k: "100%", v: "Free Always" },
              ].map(({ k, v }) => (
                <div key={v} className="space-y-1">
                  <div className="font-display text-3xl font-extrabold text-white">{k}</div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Layered Live Activity Cards with Obsidian Depth */}
          <div className="relative hidden md:flex md:col-span-5 flex-col justify-center gap-6">
            <div className="relative rounded-3xl border border-white/10 bg-surface-1 p-7 shadow-2xl shadow-black/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Live AI Matcher</span>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  Score 28/30
                </span>
              </div>
              <div className="font-display text-xl font-bold text-white">Senior Sales Executive</div>
              <div className="mt-1 text-sm text-muted-foreground">Concentrix Egypt · Enterprise Hub</div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-white/10 bg-surface-2 p-2.5">
                  <div className="text-muted-foreground text-[10px] uppercase font-semibold">Fluency</div>
                  <div className="text-white font-bold mt-0.5">9.5 / 10</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface-2 p-2.5">
                  <div className="text-muted-foreground text-[10px] uppercase font-semibold">Clarity</div>
                  <div className="text-white font-bold mt-0.5">9.2 / 10</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface-2 p-2.5">
                  <div className="text-muted-foreground text-[10px] uppercase font-semibold">Track Record</div>
                  <div className="text-white font-bold mt-0.5">9.0 / 10</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs">
                <span className="text-zinc-300 font-medium">Auto-Shortlisted to HR</span>
                <span className="font-semibold text-primary">Interview Scheduled →</span>
              </div>
            </div>

            {/* Floating Testimonial Micro-Card */}
            <div className="ml-8 -mt-2 rounded-2xl border border-white/10 bg-surface-2 p-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&q=80"
                  alt="Sarah M."
                  className="size-9 rounded-full object-cover ring-1 ring-white/20"
                />
                <div>
                  <div className="text-xs font-bold text-white">Sarah Mansour</div>
                  <div className="text-[10px] text-muted-foreground">HR Lead · Cairo Tech Park</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#E4E4E7]/90">
                "We reviewed 12 voice recordings and scheduled 5 interviews within 3 hours. QuickHire saves days of initial phone screening."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLE CATEGORIES (Spacious Grid + Layered Depth) ── */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 md:px-8">
        <div className="mb-14 text-center max-w-2xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-2 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-zinc-300">
            Specialized Recruitment
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
            Roles We Place Daily
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We focus exclusively on revenue-generating and customer-facing roles in Egypt, ensuring targeted company matches.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_CATEGORIES.map(({ icon: Icon, title, desc }) => (
            <Link
              key={title}
              to="/offers"
              className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-surface-1 p-7 shadow-xl shadow-black/40 transition-all duration-300 hover:border-white/20 hover:bg-surface-2 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/70"
            >
              <div>
                <div className="mb-5 grid size-12 place-items-center rounded-xl border border-white/10 bg-surface-2 text-white group-hover:border-primary/40 group-hover:text-primary transition-colors">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#E4E4E7]/80">
                  {desc}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground group-hover:text-white transition-colors">
                <span>View open positions</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS (3 Simple Steps + Obsidian Surfaces) ── */}
      <section className="border-y border-white/[0.06] bg-surface-1/40 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="mb-16 text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-2 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-zinc-300">
              The Process
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
              From Application to Offer in 48 Hours
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              No endless forms. No recruiter ghosting. A transparent pipeline built for Egyptian professionals.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: FileCheck,
                step: "01",
                title: "Choose a Verified Role",
                body: "Explore pre-vetted positions with clear salary packages, shift hours, and language criteria. No ambiguous postings.",
              },
              {
                icon: Mic,
                step: "02",
                title: "Apply with CV & Voice Note",
                body: "Upload your CV and record a 60-second voice pitch directly from your smartphone or desktop. Show your real communication strength.",
              },
              {
                icon: Users2,
                step: "03",
                title: "Direct HR Interview",
                body: "Our AI objectively ranks your submission. Top scorers get scheduled for a direct interview with the employer within 24 to 48 hours.",
              },
            ].map(({ icon: Icon, step, title, body }) => (
              <div
                key={title}
                className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-surface-1 p-8 shadow-xl shadow-black/40 transition-all duration-300 hover:border-white/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="grid size-12 place-items-center rounded-xl border border-white/10 bg-surface-2 text-white">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-sm font-mono font-bold text-zinc-500">
                      STEP {step}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#E4E4E7]/80">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED OFFERS SHOWCASE ── */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 md:px-8">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" /> Live Openings
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
              Featured Opportunities
            </h2>
            <p className="text-base text-muted-foreground">
              Updated daily with verified compensation and immediate interview slots.
            </p>
          </div>
          <Link
            to="/offers"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-primary transition-colors"
          >
            <span>View all {offers.length} openings</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {showcase.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {showcase.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-surface-1 p-16 text-center">
            <Zap className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-4 font-display text-xl text-white">New positions being verified</p>
            <p className="mt-2 text-sm text-muted-foreground">Check back shortly — new batches are released daily.</p>
          </div>
        )}

        <div className="mt-10 text-center sm:hidden">
          <Link
            to="/offers"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.3)]"
          >
            View all {offers.length} jobs <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS (Obsidian Layer Cards) ── */}
      <section className="border-t border-white/[0.06] bg-surface-1/30 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="mb-16 text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-2 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-zinc-300">
              Verified Candidate Outcomes
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
              Real Candidates Placed in Top Roles
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Read how job seekers in Egypt landed fast placements through AI-scored voice screening.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-surface-1 p-7 shadow-xl shadow-black/40 transition-all duration-300 hover:border-white/20"
              >
                <div>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-[#E4E4E7]/90 font-normal">
                    "{t.text}"
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="size-11 rounded-full object-cover ring-1 ring-white/20"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                  <div className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    {t.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGH-CONVERSION TRUST BANNER (1 Primary CTA) ── */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 p-10 md:p-16 shadow-2xl shadow-black/90">
          <div className="absolute right-0 top-0 size-96 rounded-full bg-primary/[0.08] blur-[100px] pointer-events-none" />

          <div className="relative grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                100% Free For Candidates
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight">
                Ready to accelerate your hiring journey?
              </h2>
              <p className="text-base text-[#E4E4E7]/90 leading-relaxed max-w-xl font-normal">
                Join thousands of Egyptian professionals getting hired in sales and customer operations. No fees, no hidden strings, and full privacy protection for your personal contact details.
              </p>
              <div className="pt-2">
                <Link
                  to="/offers"
                  className="group inline-flex items-center gap-3 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_25px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all duration-200"
                >
                  <span>Explore All Openings</span>
                  <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="md:col-span-5 grid gap-3">
              {[
                { icon: Shield, text: "Data stays private until shortlisted" },
                { icon: Mic, text: "AI speech analysis in English & German" },
                { icon: Phone, text: "Direct WhatsApp handoff to HR teams" },
                { icon: Clock, text: "Feedback guaranteed within 48 hours" },
                { icon: CheckCircle2, text: "Comprehensive interview prep packs" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-surface-1/90 px-5 py-3.5 text-sm text-zinc-200 shadow-md"
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
