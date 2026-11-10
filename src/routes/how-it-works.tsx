import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Mic, Sparkles, Users2, ShieldCheck, MessageCircle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How QuickHire Works — Egypt's Sales & Call Center Platform" },
      { name: "description", content: "See how QuickHire matches candidates to top employers using AI-scored voice notes and CVs." },
      { property: "og:title", content: "How QuickHire works" },
      { property: "og:description", content: "One application. AI-graded shortlist. Direct HR handoff." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { icon: FileText, title: "1 · Pick a Verified Role", body: "Every listing is officially confirmed with the hiring company — transparent salary packages, real requirements, zero ghost listings." },
  { icon: Mic, title: "2 · Apply with CV & Voice Note", body: "Submit your profile and record a 60-second voice note in the required languages directly from your smartphone or laptop." },
  { icon: Sparkles, title: "3 · Objective AI Scoring", body: "Our AI model analyzes pronunciation, vocabulary, and communication clarity against a transparent public rubric without recruiter bias." },
  { icon: Users2, title: "4 · Instant Shortlist to Hiring Managers", body: "Top-scoring candidates are matched directly to company HR teams, who reach out via phone or WhatsApp within 24 to 48 hours." },
  { icon: MessageCircle, title: "5 · Interview & Accept Offer", body: "Review the free interview prep kit, attend your assessment slot with your gate pass, and start your new career." },
];

function HowItWorks() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero py-20 md:py-28 border-b border-white/[0.06]">
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:4rem_4rem] pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/[0.08] blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl px-6 text-center md:px-8 space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-4 py-1.5 text-xs font-semibold text-zinc-300">
            <Sparkles className="size-3.5 text-primary" /> Transparent Recruitment
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            One Application. Zero Ghosting.
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg text-[#E4E4E7]/90 leading-relaxed font-normal">
            QuickHire bridges Egyptian sales, call-center, and customer professionals with verified employers through AI-scored voice screening.
          </p>
        </div>
      </section>

      {/* Steps Timeline */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28 md:px-8">
        <ol className="relative space-y-10 border-l border-white/15 pl-8 md:pl-10">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="relative group">
              <span className="absolute -left-[45px] md:-left-[53px] grid size-9 place-items-center rounded-xl border border-primary/40 bg-surface-1 text-primary shadow-[0_0_12px_rgba(182,255,46,0.25)]">
                <Icon className="size-4" />
              </span>
              <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-6 md:p-8 shadow-xl shadow-black/40 transition-all duration-300 hover:border-white/20">
                <h3 className="font-display text-2xl font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm md:text-base leading-relaxed text-[#E4E4E7]/90 font-normal">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Privacy & CTA (1 Primary Lime Action) */}
      <section className="mx-auto max-w-4xl px-6 pb-24 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-1 p-8 md:p-12 shadow-2xl">
          <div className="flex items-start gap-5">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white">Your Data Stays Private</h2>
              <p className="text-sm md:text-base text-[#E4E4E7]/90 leading-relaxed font-normal">
                CVs and voice recordings are stored securely in encrypted storage. Only HR coordinators for the specific job you applied to
                receive access — and only when you meet the score benchmark.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/[0.08] pt-6">
            <Link
              to="/offers"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_22px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] transition-all"
            >
              <span>Browse Live Jobs</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/prep"
              className="rounded-xl border border-white/15 bg-surface-2 px-6 py-3.5 text-sm font-semibold text-white hover:bg-surface-3 transition-colors"
            >
              Interview Prep Kit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
