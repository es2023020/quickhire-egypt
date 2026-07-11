import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Mic, Sparkles, Users2, ShieldCheck, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Talent Bridge Egypt Works — Egypt's Sales & Call Center Platform" },
      { name: "description", content: "See how Talent Bridge Egypt matches candidates to top employers using AI-scored voice notes and CVs." },
      { property: "og:title", content: "How Talent Bridge Egypt works" },
      { property: "og:description", content: "One application. AI-graded shortlist. Direct HR handoff." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { icon: FileText, title: "1 · Pick a role", body: "Every listing is verified with the hiring partner — real salary bands, real requirements, no ghost jobs." },
  { icon: Mic, title: "2 · Apply with CV + voice", body: "Upload your CV and record short voice notes in the required languages. Right from your phone." },
  { icon: Sparkles, title: "3 · AI screens you fairly", body: "We transcribe and score fluency, communication and experience against a public rubric — no bias, no ghosting." },
  { icon: Users2, title: "4 · Shortlisted to HR", body: "Top candidates are ranked and pushed directly to the HR team. Most reach out within 48 hours." },
  { icon: MessageCircle, title: "5 · Interview & get hired", body: "Bring the prep pack. If it's a fit, sign the offer — we only earn when you're placed." },
];

function HowItWorks() {
  return (
    <div>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-6 md:py-20">
          <h1 className="font-display text-4xl md:text-5xl text-balance">One process. Zero ghosting.</h1>
          <p className="mt-4 text-white/80">
            Talent Bridge Egypt is the trusted layer between talented Egyptians and the country's best call-center, sales and multilingual employers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <ol className="relative space-y-6 border-l border-border pl-6">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="relative">
              <span className="absolute -left-9 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
                <Icon className="size-3.5" />
              </span>
              <h3 className="font-display text-xl">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-lift">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl">Your data stays private</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                CVs and voice recordings are stored in private storage. Only HR teams for the specific job you applied to
                can access your file — and only if you're shortlisted. You can request deletion any time by emailing us.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/offers" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90">
              Browse open jobs
            </Link>
            <Link to="/prep" className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent">
              Get the prep pack
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
