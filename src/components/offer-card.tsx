import { Link } from "@tanstack/react-router";
import { MapPin, Briefcase, Sparkles } from "lucide-react";
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
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-soft transition-all",
        isOnHold
          ? "border-amber-200 bg-amber-50/10 opacity-80"
          : isHighMatch
          ? "border-violet-300 ring-1 ring-violet-100 bg-gradient-to-b from-card to-violet-50/10 hover:-translate-y-1 hover:shadow-lift"
          : "border-border hover:-translate-y-1 hover:shadow-lift"
      )}
    >
      {isOnHold ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-850 shadow-soft">
          On Hold
        </span>
      ) : matchScore ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-soft animate-pulse">
          ⭐ {matchScore}% Match
        </span>
      ) : offer.featured ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground shadow-gold">
          <Sparkles className="size-3" /> Featured
        </span>
      ) : null}
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-primary/80">
        {offer.category}{offer.language ? ` · ${offer.language}` : ""}
      </div>
      <h3 className={cn(
        "font-display text-xl leading-snug text-ink",
        !isOnHold && "group-hover:text-primary"
      )}>
        {offer.title}
      </h3>
      <div className="mt-1 text-sm text-muted-foreground">{offer.company}</div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{offer.summary}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{offer.location}</span>
        {offer.shift_type && (
          <span className="inline-flex items-center gap-1"><Briefcase className="size-3.5" />{offer.shift_type}</span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Package</div>
          <div className="font-display text-lg font-semibold text-primary">{offer.salary_text}</div>
        </div>
        {isOnHold ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            On Hold
          </span>
        ) : (
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Apply →
          </span>
        )}
      </div>
    </Link>
  );
}
