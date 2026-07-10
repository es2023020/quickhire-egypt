import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { listOffers } from "@/lib/offers.functions";
import { OfferCard } from "@/components/offer-card";

const offersQO = queryOptions({
  queryKey: ["offers", "public"],
  queryFn: () => listOffers(),
});

export const Route = createFileRoute("/offers/")({
  head: () => ({
    meta: [
      { title: "Sales & Call Center Jobs in Egypt — QuickHire" },
      { name: "description", content: "Browse sales, call center and business development openings across Egypt. Apply in minutes." },
      { property: "og:title", content: "Sales & Call Center Jobs in Egypt — QuickHire" },
      { property: "og:description", content: "Curated live openings updated weekly." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(offersQO),
  component: OffersPage,
});

function OffersPage() {
  const { data: offers } = useSuspenseQuery(offersQO);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [lang, setLang] = useState("all");

  const cats = useMemo(() => ["all", ...Array.from(new Set(offers.map((o) => o.category)))], [offers]);
  const langs = useMemo(
    () => ["all", ...Array.from(new Set(offers.map((o) => o.language).filter(Boolean) as string[]))],
    [offers],
  );

  const filtered = offers.filter((o) => {
    if (cat !== "all" && o.category !== cat) return false;
    if (lang !== "all" && o.language !== lang) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!(`${o.title} ${o.company} ${o.summary}`.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8">
        <h1 className="font-display text-4xl">All open jobs</h1>
        <p className="mt-2 text-muted-foreground">
          {offers.length} live openings across Cairo, Alexandria and remote.
        </p>
      </div>

      <div className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, company, keywords…"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {cats.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {langs.map((l) => <option key={l} value={l}>{l === "all" ? "All languages" : l}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No jobs match those filters — try clearing them.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}
    </div>
  );
}
