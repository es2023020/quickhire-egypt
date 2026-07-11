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
    desc: "B2B and B2C sales roles across industries",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80",
  },
  {
    icon: Phone,
    title: "Cold Callers & SDRs",
    desc: "Outbound prospecting and pipeline generation",
    color: "bg-blue-50 text-blue-700 border-blue-100",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80",
  },
  {
    icon: Headphones,
    title: "Call Center Agents",
    desc: "Inbound and outbound contact center roles",
    color: "bg-purple-50 text-purple-700 border-purple-100",
    image: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=400&q=80",
  },
  {
    icon: MessageSquare,
    title: "Customer Service Reps",
    desc: "Front-line support and relationship management",
    color: "bg-amber-50 text-amber-700 border-amber-100",
    image: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=400&q=80",
  },
  {
    icon: Users2,
    title: "Account Executives",
    desc: "Enterprise account management and growth",
    color: "bg-rose-50 text-rose-700 border-rose-100",
    image: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80",
  },
  {
    icon: Zap,
    title: "Business Dev Reps",
    desc: "Partnership development and market expansion",
    color: "bg-teal-50 text-teal-700 border-teal-100",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80",
  },
];

const TESTIMONIALS = [
  {
    name: "Ahmed Khaled",
    role: "Sales Representative at Vodafone",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
    text: "Applied on Monday, had an interview on Wednesday, started the job the following week. Talent Bridge Egypt is unbelievably fast.",
    score: "28/30",
  },
  {
    name: "Nour Mahmoud",
    role: "Call Center Agent at Teleperformance",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
    text: "The voice recording feature made me stand out. HR told me they could already tell I had good communication before the interview.",
    score: "26/30",
  },
  {
    name: "Omar Samir",
    role: "SDR at Flat6Labs",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80",
    text: "Finally a platform that understands the Egyptian job market. No ghost listings, real salaries, and the prep resources are gold.",
    score: "30/30",
  },
];

function Home() {
  const { data: offers } = useSuspenseQuery(offersQO);
  const featured = offers.filter((o) => o.featured).slice(0, 6);
  const showcase = featured.length ? featured : offers.slice(0, 6);

  return (
    <div>
      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_30%_20%,white_1px,transparent_1px),radial-gradient(circle_at_70%_80%,white_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -right-40 -top-40 size-[600px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-[400px] rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:py-32 md:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur border border-white/20">
              <Sparkles className="size-3.5" /> Egypt's #1 Sales & Call Center Hiring Platform
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-balance md:text-6xl font-bold">
              Get hired in sales &amp; call center — <span className="text-amber-300">fast.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/80 leading-relaxed">
              Apply once. Our AI scores your CV and voice note. The top HR teams across Egypt
              call you directly — no middlemen, no ghost listings.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/offers"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-lift hover:bg-white/95 transition-all"
              >
                Browse Open Jobs <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-all"
              >
                How it works
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-sm border-t border-white/10 pt-8">
              {[
                { k: "+50", v: "Live openings" },
                { k: "24h", v: "Avg. screening" },
                { k: "100%", v: "Free for you" },
              ].map(({ k, v }) => (
                <div key={v}>
                  <div className="font-display text-3xl font-bold">{k}</div>
                  <div className="mt-0.5 text-xs uppercase tracking-wider text-white/60">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden md:flex flex-col justify-center gap-4">
            {/* Live activity card */}
            <div className="absolute -right-6 top-0 w-80 rotate-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-lift">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-xs text-white/70 uppercase tracking-wider">Live — Latest match</div>
              </div>
              <div className="font-display text-xl text-white">Senior Sales Rep · Concentrix</div>
              <div className="mt-1 text-sm text-white/70">Score 28/30 · English 9 · Comm 10 · Exp 9</div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-white/80">CV ✓</span>
                <span className="rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-white/80">Voice ✓</span>
                <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 text-amber-300 font-semibold">Shortlisted 🎯</span>
              </div>
            </div>
            <div className="absolute right-8 bottom-10 -rotate-2 w-72 rounded-2xl bg-white p-5 text-ink shadow-lift">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">HR Message</div>
              <div className="mt-2 text-sm leading-relaxed">
                "Shortlist of 8 ready — voice notes impressive. Scheduling interviews for Monday."
              </div>
              <div className="mt-3 flex items-center gap-2">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=32&q=80"
                  alt="HR"
                  className="size-6 rounded-full object-cover"
                />
                <span className="text-xs text-muted-foreground">Sarah M. · HR Manager</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLE CATEGORIES ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Roles We Place
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl">
            Specialised in sales &amp; customer-facing roles
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            We only work with the roles we know best — so your application always reaches the right people.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_CATEGORIES.map(({ icon: Icon, title, desc, color }) => (
            <Link
              key={title}
              to="/offers"
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div className={`shrink-0 grid size-11 place-items-center rounded-xl border ${color}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">{title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="bg-sand-gradient">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl md:text-4xl">How Talent Bridge Egypt works</h2>
            <p className="mt-3 text-muted-foreground">From application to hired — in as little as 48 hours.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: FileCheck,
                step: "01",
                title: "Pick a role",
                body: "Browse curated openings. Real salaries, real requirements — no ghost listings, no recruiters chasing commission.",
                color: "bg-primary/10 text-primary",
              },
              {
                icon: Mic,
                step: "02",
                title: "Apply in 5 minutes",
                body: "Upload your CV and record a short voice note directly from your phone. We hear your real communication style.",
                color: "bg-amber-100 text-amber-700",
              },
              {
                icon: Users2,
                step: "03",
                title: "Get shortlisted & hired",
                body: "Our AI ranks candidates by fluency, communication, and experience. Top picks get a direct HR call within 24–48h.",
                color: "bg-emerald-100 text-emerald-700",
              },
            ].map(({ icon: Icon, step, title, body, color }) => (
              <div key={title} className="relative rounded-2xl border border-border bg-card p-7 shadow-soft">
                <div className="absolute -top-3 left-6 rounded-full bg-sand border border-border px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                  Step {step}
                </div>
                <div className={`grid size-12 place-items-center rounded-xl ${color}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED OFFERS ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <Sparkles className="size-3" /> Featured Openings
            </span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">Hand-picked from top employers</h2>
            <p className="mt-2 text-muted-foreground">Updated daily. Real salaries, real companies.</p>
          </div>
          <Link to="/offers" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline md:inline-flex">
            View all jobs <ArrowRight className="size-4" />
          </Link>
        </div>
        {showcase.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {showcase.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-16 text-center">
            <Zap className="mx-auto size-10 text-muted-foreground/30" />
            <p className="mt-4 font-display text-xl text-muted-foreground">New listings coming soon</p>
            <p className="mt-2 text-sm text-muted-foreground">Check back shortly — we post new roles daily.</p>
          </div>
        )}
        <div className="mt-8 text-center md:hidden">
          <Link to="/offers" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
            View all jobs <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="bg-sand-gradient">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl md:text-4xl">Candidates who got hired</h2>
            <p className="mt-3 text-muted-foreground">Real people, real results — no fabricated testimonials.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="size-10 rounded-full object-cover" />
                  <div>
                    <div className="text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                  <div className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    {t.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST / CTA ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="rounded-3xl bg-hero overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative grid md:grid-cols-2 gap-10 p-10 md:p-14 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl text-white font-bold leading-tight">
                Free for candidates.<br />Always.
              </h2>
              <p className="mt-4 text-white/80 leading-relaxed">
                We're paid by hiring partners when you get placed. You keep your data private —
                only shortlisted profiles are shared with HR.
              </p>
              <Link
                to="/offers"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-lift hover:bg-white/95 transition-all"
              >
                Find your next role <ArrowRight className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-3">
              {[
                { icon: Shield, text: "Your CV stays private until you're shortlisted" },
                { icon: Mic, text: "Voice notes analyzed with AI, never shared publicly" },
                { icon: Phone, text: "Direct WhatsApp handoff to real HR contacts" },
                { icon: Clock, text: "Hear back from HR within 24–48 hours" },
                { icon: Upload, text: "Upload existing audio or record live — your choice" },
                { icon: CheckCircle2, text: "Prep resources and interview scripts included free" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white">
                  <Icon className="size-4 shrink-0 text-amber-300" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
