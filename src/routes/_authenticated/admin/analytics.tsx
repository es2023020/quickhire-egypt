import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Users,
  Star,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { adminListApplications } from "@/lib/applications.functions";
import { adminListOffers } from "@/lib/offers.functions";
import { PIPELINE_STAGES } from "./applicants.index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Funnel — QuickHire Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const apps = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => adminListApplications({ data: {} }),
  });
  const offers = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: () => adminListOffers(),
  });

  const allApps = apps.data ?? [];
  const allOffers = offers.data ?? [];

  if (apps.isLoading || offers.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = allApps.length;
  const shortlisted = allApps.filter((a) => a.status === "shortlisted").length;
  const hired = allApps.filter(
    (a) => a.status === "hired" || a.pipeline_stage === "accepted"
  ).length;
  const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;
  const shortlistRate = total > 0 ? Math.round((shortlisted / total) * 100) : 0;

  const avgScore =
    allApps.filter((a) => a.total_score != null).length > 0
      ? (
          allApps.reduce((s, a) => s + (a.total_score ?? 0), 0) /
          allApps.filter((a) => a.total_score != null).length
        ).toFixed(1)
      : "—";

  // 10-Stage Funnel Calculation
  const funnelStages = [
    { key: "applied", label: "1. Sourced / Applied", color: "bg-blue-500" },
    { key: "test_invited", label: "2. Assessment Sent", color: "bg-amber-500" },
    { key: "test_completed", label: "3. Test Completed", color: "bg-orange-500" },
    { key: "interview_scheduled", label: "4. Wave Scheduled", color: "bg-violet-500" },
    { key: "interview_done", label: "5. Interview Evaluated", color: "bg-indigo-500" },
    { key: "offer_pending", label: "6. Offer Approval", color: "bg-yellow-500" },
    { key: "offer_extended", label: "7. Offer Extended", color: "bg-teal-500" },
    { key: "accepted", label: "8. Signed / Placed", color: "bg-emerald-500" },
  ];

  // Stage count tally
  const stageCounts: Record<string, number> = {};
  PIPELINE_STAGES.forEach((s) => {
    stageCounts[s.key] = allApps.filter((a) => (a.pipeline_stage || "applied") === s.key).length;
  });

  // Calculate cumulative or direct counts
  const funnelMetrics = funnelStages.map((st) => {
    const directCount = stageCounts[st.key] || 0;
    const pct = total > 0 ? Math.round((directCount / total) * 100) : 0;
    return { ...st, count: directCount, pct };
  });

  const maxFunnelCount = Math.max(...funnelMetrics.map((f) => f.count), 1);

  // Score distribution
  const scoreBuckets = [
    {
      label: "24–30 (Exceptional)",
      count: allApps.filter((a) => (a.total_score ?? 0) >= 24).length,
      color: "bg-emerald-500",
    },
    {
      label: "20–23 (Good / Qualified)",
      count: allApps.filter(
        (a) => (a.total_score ?? 0) >= 20 && (a.total_score ?? 0) < 24
      ).length,
      color: "bg-blue-500",
    },
    {
      label: "15–19 (Average / Bench)",
      count: allApps.filter(
        (a) => (a.total_score ?? 0) >= 15 && (a.total_score ?? 0) < 20
      ).length,
      color: "bg-amber-500",
    },
    {
      label: "0–14 (Needs Training)",
      count: allApps.filter(
        (a) => a.total_score != null && (a.total_score ?? 0) < 15
      ).length,
      color: "bg-red-400",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl flex items-center gap-2.5">
          <BarChart3 className="size-7 text-primary" /> Recruitment Funnel &amp; Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time BPO operational throughput, conversion rates, and stage drop-offs.
        </p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total Candidates"
          value={total}
          color="text-primary"
          sub="Registered in database"
        />
        <KpiCard
          icon={Star}
          label="Shortlist Conversion"
          value={`${shortlistRate}%`}
          color="text-amber-600"
          sub={`${shortlisted} candidates approved`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Placement Rate"
          value={`${conversionRate}%`}
          color="text-emerald-600"
          sub={`${hired} candidates placed`}
        />
        <KpiCard
          icon={BarChart3}
          label="Mean AI Fluency Score"
          value={avgScore}
          color="text-blue-600"
          sub="out of 30 total points"
        />
      </div>

      {/* ── 10-STAGE BPO RECRUITMENT FUNNEL ── */}
      <div className="rounded-2xl border border-border bg-white shadow-soft p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <Layers className="size-5 text-violet-600" /> End-to-End Pipeline Funnel
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidate distribution across the 8 forward hiring stages
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sand text-ink border border-border">
            Total active pool: {total}
          </span>
        </div>

        <div className="space-y-4">
          {funnelMetrics.map((stage, idx) => {
            const widthPct = Math.max((stage.count / maxFunnelCount) * 100, 3);
            return (
              <div key={stage.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <span className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.label}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-ink">{stage.count} candidates</span>
                    <span className="text-[11px] text-muted-foreground w-12 text-right">
                      {stage.pct}%
                    </span>
                  </div>
                </div>

                <div className="h-3 w-full bg-sand/60 rounded-full overflow-hidden border border-border/40">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", stage.color)}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Funnel Drop-off / Outcome Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
          <div className="rounded-xl border border-border bg-sand/20 p-3.5">
            <span className="text-xs text-muted-foreground font-semibold block">Accepted Offers</span>
            <span className="text-xl font-bold text-emerald-700 font-display">
              {stageCounts["accepted"] || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Signed corporate contracts</span>
          </div>
          <div className="rounded-xl border border-border bg-sand/20 p-3.5">
            <span className="text-xs text-muted-foreground font-semibold block">Offers Extended</span>
            <span className="text-xl font-bold text-violet-700 font-display">
              {stageCounts["offer_extended"] || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Awaiting candidate sign-off</span>
          </div>
          <div className="rounded-xl border border-border bg-sand/20 p-3.5">
            <span className="text-xs text-muted-foreground font-semibold block">Archived / Withdrawn</span>
            <span className="text-xl font-bold text-slate-700 font-display">
              {(stageCounts["rejected"] || 0) + (stageCounts["withdrawn"] || 0)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Cooldown or dropped out</span>
          </div>
        </div>
      </div>

      {/* Grid: AI Score Distribution & Roles Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <div className="rounded-2xl border border-border bg-white shadow-soft p-5">
          <h2 className="font-display text-base font-bold text-ink mb-4">
            AI Assessment Fluency Tiers
          </h2>
          <div className="space-y-3.5">
            {scoreBuckets.map(({ label, count, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="font-bold text-ink">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-sand overflow-hidden border border-border/40">
                  <div
                    className={cn("h-full rounded-full transition-all", color)}
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Applications by Role */}
        <div className="rounded-2xl border border-border bg-white shadow-soft p-5">
          <h2 className="font-display text-base font-bold text-ink mb-4">
            Talent Demand by Corporate Account
          </h2>
          <div className="space-y-3">
            {allOffers.map((o) => {
              const count = allApps.filter((a) => a.offer_id === o.id).length;
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-ink block truncate">{o.title}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{o.company}</span>
                  </div>
                  <span className="font-bold font-mono px-2 py-0.5 rounded-full bg-sand text-ink shrink-0">
                    {count} apps
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={cn("grid size-8 place-items-center rounded-xl bg-sand", color)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className={cn("font-display text-3xl font-bold", color)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
