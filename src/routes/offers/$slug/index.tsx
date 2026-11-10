import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Briefcase, Languages, Check, ArrowRight, Sparkles, Gift, Share2, ShieldCheck } from "lucide-react";
import { getOfferBySlug } from "@/lib/offers.functions";

const offerQO = (slug: string) =>
  queryOptions({
    queryKey: ["offer", slug],
    queryFn: () => getOfferBySlug({ data: { slug } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/offers/$slug/")({
  loader: async ({ context, params }) => {
    const offer = await context.queryClient.ensureQueryData(offerQO(params.slug));
    if (!offer) throw notFound();
    return { offer };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.offer.title} — ${loaderData.offer.company} | QuickHire` },
            { name: "description", content: loaderData.offer.summary },
            { property: "og:title", content: `${loaderData.offer.title} — ${loaderData.offer.company}` },
            { property: "og:description", content: loaderData.offer.summary },
          ],
        }
      : { meta: [{ title: "Job not found — QuickHire" }, { name: "robots", content: "noindex" }] },
  component: OfferDetail,
});

function OfferDetail() {
  const { slug } = Route.useParams();
  const { data: offer } = useSuspenseQuery(offerQO(slug));
  if (!offer) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16 space-y-10 bg-background text-foreground">
      <Link
        to="/offers"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
      >
        ← Back to all openings
      </Link>

      {/* ── HEADER CARD (Midnight Depth + Single Primary Lime CTA) ── */}
      <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-1 p-8 md:p-12 shadow-2xl shadow-black/80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-white/10 bg-surface-2 px-3 py-1 text-xs font-semibold text-zinc-300">
                {offer.category}
              </span>
              {offer.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="size-3" /> Featured
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white">
              {offer.title}
            </h1>
            <div className="text-lg font-medium text-muted-foreground">{offer.company}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-2 p-5 text-right sm:min-w-[180px]">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Offered Package
            </div>
            <div className="font-display text-2xl md:text-3xl font-bold text-white mt-1">
              {offer.salary_text}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-1.5 text-zinc-200">
            <MapPin className="size-4 text-primary" /> {offer.location}
          </span>
          {offer.shift_type && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-1.5 text-zinc-200">
              <Briefcase className="size-4 text-primary" /> {offer.shift_type}
            </span>
          )}
          {offer.language && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-1.5 text-zinc-200">
              <Languages className="size-4 text-primary" /> {offer.language}
            </span>
          )}
        </div>

        {/* Actionable Visual Guide: Primary Lime Green Action */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          {offer.status === "on_hold" ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-300">
              ⚠️ Applications for this opening are temporarily paused while interviews take place.
            </div>
          ) : (
            <Link
              to="/offers/$slug/apply"
              params={{ slug: offer.slug }}
              className="group inline-flex items-center gap-3 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_25px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all duration-200"
            >
              <span>Apply Now</span>
              <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </header>

      {/* ── DETAILS & ASIDE (Generous Whitespace & Readable Typography) ── */}
      <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2 space-y-10">
          <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-8 shadow-xl">
            <h2 className="font-display text-2xl font-bold text-white">About the Role</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#E4E4E7]/90 font-normal">
              {offer.description}
            </p>
          </section>

          {offer.requirements?.length > 0 && (
            <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-8 shadow-xl">
              <h2 className="font-display text-2xl font-bold text-white">Candidate Requirements</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {offer.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-3 text-[#E4E4E7]/90 leading-relaxed">
                    <Check className="mt-1 size-4 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {offer.benefits?.length > 0 && (
            <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-8 shadow-xl">
              <h2 className="font-display text-2xl font-bold text-white">Compensation &amp; Perks</h2>
              <ul className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                {offer.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-2 p-4 text-[#E4E4E7]/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-6 shadow-xl space-y-4">
            <h3 className="font-display text-lg font-bold text-white">What You Need</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5 text-zinc-300">
                <Check className="mt-0.5 size-4 text-primary" /> Profile details (2 min)
              </li>
              <li className="flex items-start gap-2.5 text-zinc-300">
                <Check className="mt-0.5 size-4 text-primary" /> Up-to-date CV (PDF)
              </li>
              {(offer.form_schema?.voice_notes ?? []).map((v) => (
                <li key={v.lang} className="flex items-start gap-2.5 text-zinc-300">
                  <Check className="mt-0.5 size-4 text-primary" /> 60s {v.lang} voice note
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-xl space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Screening Tip</div>
            <p className="text-sm leading-relaxed text-[#E4E4E7]/90 font-normal">
              Record in a quiet environment. Speak naturally for 45–60 seconds. Our AI evaluates pronunciation clarity and commercial enthusiasm.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Gift className="size-4" />
              <span>Referral Bounty</span>
            </div>
            <h4 className="font-display text-base font-bold text-white">
              Earn 1,000 – 3,500 EGP Bounty
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Know someone perfect for this role? Share it directly on WhatsApp. If they get hired, your referral cash bounty is issued directly.
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `🔥 فرصة عمل ممتازة: *${offer.title}* في *${offer.company}*.\nالمرتب: ${offer.salary_text} (${offer.location}).\nالتقديم وتسجيل الفويس أونلاين:\n${typeof window !== "undefined" ? window.location.href : "https://quickhire.eg"}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-3 border border-white/15 px-4 py-3 text-xs font-bold text-white hover:bg-white/[0.08] transition-colors"
            >
              <Share2 className="size-4 text-primary" /> Share on WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
