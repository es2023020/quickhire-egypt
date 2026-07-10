import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Mic, FileCheck, Users2, Sparkles } from "lucide-react";
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

function Home() {
  const { data: offers } = useSuspenseQuery(offersQO);
  const featured = offers.filter((o) => o.featured).slice(0, 6);
  const rest = featured.length ? offers.slice(0, 6) : offers.slice(0, 6);
  const showcase = featured.length ? featured : rest;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_10%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28 md:px-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-3.5" /> Hiring-as-a-Service, built for Egypt
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] text-balance md:text-6xl">
              Land your next call center, sales or multilingual role in Egypt.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/80">
              One application. AI-graded shortlist. Direct handoff to the HR teams that actually hire.
              CVs and voice notes handled privately.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/offers"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-primary shadow-lift hover:bg-white/95"
              >
                Browse open jobs <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/prep"
                className="inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Get the interview prep pack
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              {[
                ["+15", "Live openings"],
                ["24h", "Avg. screening"],
                ["100%", "Free for candidates"],
              ].map(([k, v]) => (
                <div key={v}>
                  <div className="font-display text-2xl">{k}</div>
                  <div className="text-xs uppercase tracking-wider text-white/70">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -right-10 top-6 rotate-2 rounded-2xl bg-white/10 p-5 backdrop-blur shadow-lift">
              <div className="text-xs uppercase tracking-wider text-white/70">Latest match</div>
              <div className="mt-2 font-display text-xl">Multilingual TL · Concentrix</div>
              <div className="mt-1 text-sm text-white/80">Total score 27/30 · Fluency 9 · Comm 9 · Exp 9</div>
              <div className="mt-4 flex gap-2 text-xs text-white/80">
                <span className="rounded-full bg-white/10 px-2 py-1">CV parsed</span>
                <span className="rounded-full bg-white/10 px-2 py-1">Voice ✓</span>
                <span className="rounded-full bg-gold-gradient px-2 py-1 text-gold-foreground">Shortlisted</span>
              </div>
            </div>
            <div className="absolute right-24 top-56 -rotate-3 rounded-2xl bg-white p-5 text-ink shadow-lift">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">HR message</div>
              <div className="mt-2 text-sm">
                "Shortlist ready — 12 candidates ranked by fluency & experience. Play the voice notes right in the dashboard."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl md:text-4xl">How HireEgypt works</h2>
          <p className="mt-3 text-muted-foreground">Three steps between you and an offer.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: FileCheck, title: "Pick a role", body: "Browse curated openings. Real salaries, real requirements — no ghost listings." },
            { icon: Mic, title: "Apply in 5 minutes", body: "Upload your CV and record short voice notes in the required languages, right from your phone." },
            { icon: Users2, title: "Get shortlisted", body: "Our AI scores fluency, communication and experience. Top candidates get contacted by HR directly." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured offers */}
      <section className="bg-sand-gradient">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl md:text-4xl">Featured openings</h2>
              <p className="mt-2 text-muted-foreground">Hand-picked from our top hiring partners.</p>
            </div>
            <Link to="/offers" className="hidden text-sm font-medium text-primary hover:underline md:inline">
              View all →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {showcase.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6">
        <h2 className="font-display text-3xl md:text-4xl">Free for candidates. Always.</h2>
        <p className="mt-4 text-muted-foreground">
          We're paid by hiring partners when you get placed. You keep your data private —
          only shortlisted profiles are shared with HR.
        </p>
        <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-left text-sm md:grid-cols-2">
          {[
            "Your CV stays private until you're shortlisted",
            "Voice notes analyzed with AI, never shared publicly",
            "Direct WhatsApp handoff to real HR contacts",
            "Prep resources and interview scripts included",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 rounded-lg bg-sand p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
