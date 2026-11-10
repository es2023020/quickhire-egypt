import { Link } from "@tanstack/react-router";
import { MapPin, Briefcase, Sparkles, ArrowRight } from "lucide-react";
import type { Offer } from "@/lib/offers.types";
import { cn } from "@/lib/utils";

export function OfferCard({ offer, matchScore }: { offer: Offer; matchScore?: number }) {
  const isHighMatch = matchScore && matchScore >= 80;
  const isOnHold = offer.status === "on_hold";

  return (
    <Link
      to="/offers/$slug"
      params={{ slug: offer.slug }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-surface-1 p-7 shadow-xl shadow-black/40 transition-all duration-300",
        isOnHold
          ? "border-amber-500/30 bg-surface-1/90 opacity-80"
          : isHighMatch
          ? "border-primary/40 bg-gradient-to-b from-surface-1 to-surface-2 ring-1 ring-primary/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/70"
          : "border-white/[0.08] hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/70"
      )}
    >
      {/* Top subtle highlight gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
            <span>{offer.category}</span>
            {offer.language && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-white font-semibold">{offer.language}</span>
              </>
            )}
          </div>

          {isOnHold ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              On Hold
            </span>
          ) : matchScore ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-[0_0_10px_rgba(182,255,46,0.25)]">
              ⭐ {matchScore}% Match
            </span>
          ) : offer.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" /> Featured
            </span>
          ) : null}
        </div>

        <h3 className={cn(
          "font-display text-xl font-bold leading-snug text-white transition-colors duration-200",
          !isOnHold && "group-hover:text-primary"
        )}>
          {offer.title}
        </h3>

        <div className="mt-1 text-sm font-medium text-muted-foreground">{offer.company}</div>

        <p className="mt-3.5 line-clamp-2 text-sm leading-relaxed text-[#E4E4E7]/80">
          {offer.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <MapPin className="size-3.5 text-primary/80" />
            {offer.location}
          </span>
          {offer.shift_type && (
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <Briefcase className="size-3.5 text-primary/80" />
              {offer.shift_type}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Package
          </div>
          <div className="font-display text-lg font-bold text-white mt-0.5">
            {offer.salary_text}
          </div>
        </div>

        {isOnHold ? (
          <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300">
            Paused
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.2)] group-hover:shadow-[0_0_16px_rgba(182,255,46,0.5)] group-hover:bg-[#c2ff47] transition-all duration-200">
            <span>Apply</span>
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </Link>
  );
}
