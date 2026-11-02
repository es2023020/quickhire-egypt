import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Briefcase, Languages, Check, ArrowRight, Sparkles, Gift, Share2 } from "lucide-react";
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
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/offers" className="text-sm text-muted-foreground hover:text-foreground">← Back to jobs</Link>

      <header className="mt-4 rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              {offer.category}
              {offer.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-[10px] text-gold-foreground shadow-gold">
                  <Sparkles className="size-3" /> Featured
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl">{offer.title}</h1>
            <div className="mt-1 text-lg text-muted-foreground">{offer.company}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Package</div>
            <div className="font-display text-2xl text-primary">{offer.salary_text}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1"><MapPin className="size-3.5" />{offer.location}</span>
          {offer.shift_type && <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1"><Briefcase className="size-3.5" />{offer.shift_type}</span>}
          {offer.language && <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1"><Languages className="size-3.5" />{offer.language}</span>}
        </div>

        {offer.status === "on_hold" ? (
          <div className="mt-6">
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-850 shadow-soft">
              ⚠️ This position is currently on hold. Applications are temporarily paused.
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <Link
              to="/offers/$slug/apply"
              params={{ slug: offer.slug }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-90"
            >
              Apply now <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="font-display text-2xl">About the role</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{offer.description}</p>
          </section>

          {offer.requirements?.length > 0 && (
            <section>
              <h2 className="font-display text-2xl">Requirements</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {offer.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-primary" />{r}</li>
                ))}
              </ul>
            </section>
          )}

          {offer.benefits?.length > 0 && (
            <section>
              <h2 className="font-display text-2xl">Benefits</h2>
              <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                {offer.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 rounded-lg bg-sand p-3">
                    <Check className="mt-0.5 size-4 text-success" />{b}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg">What you'll send</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-primary" /> A short profile (2 min)</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-primary" /> Your CV (PDF)</li>
              {(offer.form_schema?.voice_notes ?? []).map((v) => (
                <li key={v.lang} className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-primary" /> {v.lang} voice note</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-hero p-5 text-primary-foreground shadow-lift">
            <div className="text-xs uppercase tracking-wider opacity-80">Pro tip</div>
            <p className="mt-1 text-sm">
              Record your voice note in a quiet room. Speak naturally for 45–60 seconds — clarity matters more than perfect grammar.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-soft text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-800 mb-1.5">
              <Gift className="size-3.5 text-violet-600" />
              <span>Know someone qualified?</span>
            </div>
            <h4 className="font-display text-sm font-bold text-ink">
              Earn 1,000 – 3,500 EGP Referral Bounty
            </h4>
            <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">
              Share this opening with your network on WhatsApp. When your friend is hired, your bounty is sent straight to your wallet.
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `🔥 فرصة عمل ممتازة: *${offer.title}* في *${offer.company}*.\nالمرتب: ${offer.salary_text} (${offer.location}).\nالتقديم وتسجيل الفويس أونلاين في 3 دقايق:\n${typeof window !== "undefined" ? window.location.href : "https://quickhire.eg"}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:opacity-90 transition-opacity"
            >
              <Share2 className="size-3.5" /> Share on WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
