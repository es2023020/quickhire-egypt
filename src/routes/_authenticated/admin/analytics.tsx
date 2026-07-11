import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2, TrendingUp, Users, Star, Briefcase } from "lucide-react";
import { adminListApplications } from "@/lib/applications.functions";
import { adminListOffers } from "@/lib/offers.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: Analytics,
});

function Analytics() {
  const apps = useQuery({ queryKey: ["admin", "applications"], queryFn: () => adminListApplications({ data: {} }) });
  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });

  const allApps = apps.data ?? [];
  const allOffers = offers.data ?? [];

  if (apps.isLoading || offers.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  const total = allApps.length;
  const shortlisted = allApps.filter(a => a.status === "shortlisted").length;
  const hired = allApps.filter(a => a.status === "hired").length;
  const rejected = allApps.filter(a => a.status === "rejected").length;
  const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;
  const shortlistRate = total > 0 ? Math.round((shortlisted / total) * 100) : 0;

  const avgScore = allApps.filter(a => a.total_score != null).length > 0
    ? (allApps.reduce((s, a) => s + (a.total_score ?? 0), 0) / allApps.filter(a => a.total_score != null).length).toFixed(1)
    : "—";

  // By offer breakdown
  const byOffer = allOffers.map(o => ({
    title: o.title,
    company: o.company,
    count: allApps.filter(a => a.offer_id === o.id).length,
    shortlisted: allApps.filter(a => a.offer_id === o.id && a.status === "shortlisted").length,
    avgScore: (() => {
      const relevant = allApps.filter(a => a.offer_id === o.id && a.total_score != null);
      if (!relevant.length) return null;
      return (relevant.reduce((s, a) => s + (a.total_score ?? 0), 0) / relevant.length).toFixed(1);
    })(),
  })).filter(o => o.count > 0).sort((a, b) => b.count - a.count);

  // By category
  const byCategory: Record<string, number> = {};
  allApps.forEach(a => {
    const cat = a.offer?.title ?? "Unknown";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  });
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = categories[0]?.[1] ?? 1;

  // Score distribution
  const scoreBuckets = [
    { label: "25–30 (Excellent)", count: allApps.filter(a => (a.total_score ?? 0) >= 25).length, color: "bg-emerald-500" },
    { label: "20–24 (Good)", count: allApps.filter(a => (a.total_score ?? 0) >= 20 && (a.total_score ?? 0) < 25).length, color: "bg-blue-500" },
    { label: "15–19 (Average)", count: allApps.filter(a => (a.total_score ?? 0) >= 15 && (a.total_score ?? 0) < 20).length, color: "bg-amber-500" },
    { label: "0–14 (Below avg)", count: allApps.filter(a => a.total_score != null && (a.total_score ?? 0) < 15).length, color: "bg-red-400" },
    { label: "Not scored", count: allApps.filter(a => a.total_score == null).length, color: "bg-border" },
  ];
  const maxScore = Math.max(...scoreBuckets.map(b => b.count), 1);

  // Recent applications by day
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
    return {
      label,
      count: allApps.filter(a => a.created_at.startsWith(key)).length,
    };
  });
  const maxDay = Math.max(...last7.map(d => d.count), 1);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
          <BarChart3 className="size-7 text-primary" /> Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform performance and recruitment metrics</p>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Total Applications" value={total} color="text-primary" />
        <KpiCard icon={Star} label="Shortlist Rate" value={`${shortlistRate}%`} color="text-amber-600" sub={`${shortlisted} candidates`} />
        <KpiCard icon={TrendingUp} label="Hire Rate" value={`${conversionRate}%`} color="text-emerald-600" sub={`${hired} placed`} />
        <KpiCard icon={BarChart3} label="Avg AI Score" value={avgScore} color="text-blue-600" sub="out of 30" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Applications over 7 days */}
        <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
          <h2 className="font-display text-lg mb-4">Applications — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-32">
            {last7.map(({ label, count }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-xs font-bold text-primary">{count > 0 ? count : ""}</div>
                <div
                  className="w-full rounded-t-lg bg-primary/80 transition-all"
                  style={{ height: `${(count / maxDay) * 100}%`, minHeight: count > 0 ? "4px" : "0" }}
                />
                <div className="text-[10px] text-muted-foreground text-center">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score distribution */}
        <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
          <h2 className="font-display text-lg mb-4">AI Score Distribution</h2>
          <div className="space-y-3">
            {scoreBuckets.map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-bold text-ink">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${(count / maxScore) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By offer */}
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-lg">Applications by Role</h2>
          </div>
          <div className="divide-y divide-border">
            {byOffer.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No data yet</div>
            ) : byOffer.map(o => (
              <div key={o.title} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{o.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{o.company}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-muted-foreground">{o.count} apps</span>
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-semibold">{o.shortlisted} shortlisted</span>
                  {o.avgScore && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-bold">avg {o.avgScore}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By category bar chart */}
        <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
          <h2 className="font-display text-lg mb-4">Top Roles Applied To</h2>
          <div className="space-y-3">
            {categories.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{cat}</span>
                  <span className="text-xs font-bold text-ink shrink-0 ml-2">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`grid size-8 place-items-center rounded-lg bg-current/10 ${color}`}>
          <Icon className={`size-4 ${color}`} />
        </div>
      </div>
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
