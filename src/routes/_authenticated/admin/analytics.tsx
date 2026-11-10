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
  Sparkles,
} from "lucide-react";
import { adminListApplications } from "@/lib/applications.functions";
import { adminListOffers } from "@/lib/offers.functions";
import { PIPELINE_STAGES } from "./applicants.index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Funnel Analytics — QuickHire Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
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
        <Loader2 className="size-8 animate-spin text-primary" />
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

  // 8-Stage Funnel Calculation
  const funnelStages = [
    { key: "applied", label: "1. Sourced / Applied", color: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" },
    { key: "test_invited", label: "2. Assessment Sent", color: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" },
    { key: "test_completed", label: "3. Test Completed", color: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" },
    { key: "interview_scheduled", label: "4. Wave Scheduled", color: "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" },
    { key: "interview_done", label: "5. Interview Evaluated", color: "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" },
    { key: "offer_pending", label: "6. Offer Approval", color: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" },
    { key: "offer_extended", label: "7. Offer Extended", color: "bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]" },
    { key: "accepted", label: "8. Signed / Placed", color: "bg-primary shadow-[0_0_12px_rgba(182,255,46,0.6)]" },
  ];

  // Stage count tally
  const stageCounts: Record<string, number> = {};
  PIPELINE_STAGES.forEach((s) => {
    stageCounts[s.key] = allApps.filter((a) => (a.pipeline_stage || "applied") === s.key).length;
  });

  const funnelMetrics = funnelStages.map((st) => {
    const directCount = stageCounts[st.key] || 0;
    const pct = total > 0 ? Math.round((directCount / total) * 100) : 0;
    return { ...st, count: directCount, pct };
  });

  const maxFunnelCount = Math.max(...funnelMetrics.map((f) => f.count), 1);

  // Score distribution
  const scoreBuckets = [
    {
      label: "24–30 (Exceptional — Top Tier)",
      count: allApps.filter((a) => (a.total_score ?? 0) >= 24).length,
      color: "bg-primary shadow-[0_0_8px_rgba(182,255,46,0.4)]",
    },
    {
      label: "18–23 (Proficient — Qualified B2/C1)",
      count: allApps.filter((a) => {
        const s = a.total_score ?? 0;
        return s >= 18 && s < 24;
      }).length,
      color: "bg-blue-400",
    },
    {
      label: "12–17 (Developing — Needs Coaching)",
      count: allApps.filter((a) => {
        const s = a.total_score ?? 0;
        return s >= 12 && s < 18;
      }).length,
      color: "bg-amber-400",
    },
    {
      label: "Below 12 (Archive / Domestic Pool)",
      count: allApps.filter((a) => (a.total_score ?? 0) < 12).length,
      color: "bg-red-400",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 bg-background text-foreground">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono mb-2">
          <BarChart3 className="size-3.5" /> RECRUITMENT INTELLIGENCE
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2.5">
          Recruitment Funnel &amp; AI Analytics
        </h1>
        <p className="mt-1 text-sm text-[#E4E4E7]/80">
          Real-time BPO throughput, qualification yield, drop-off rates, and talent distribution.
        </p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total Candidates"
          value={total}
          color="text-white"
          sub="Registered in candidate pool"
        />
        <KpiCard
          icon={Star}
          label="Shortlist Conversion"
          value={`${shortlistRate}%`}
          color="text-amber-400"
          sub={`${shortlisted} candidates approved`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Placement Rate"
          value={`${conversionRate}%`}
          color="text-primary"
          sub={`${hired} candidates placed`}
        />
        <KpiCard
          icon={Sparkles}
          label="Mean AI Fluency Score"
          value={avgScore}
          color="text-primary"
          sub="out of 30 total evaluation points"
        />
      </div>

      {/* ── 8-STAGE BPO RECRUITMENT FUNNEL ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Layers className="size-5 text-primary" /> End-to-End Pipeline Funnel
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidate distribution across the 8 hiring phases
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-surface-2 text-zinc-300 border border-white/10">
            Total active pool: {total} candidates
          </span>
        </div>

        {/* Funnel Progress Bars */}
        <div className="space-y-4">
          {funnelMetrics.map((stage) => {
            const widthPct = Math.max(Math.round((stage.count / maxFunnelCount) * 100), 2);

            return (
              <div key={stage.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-white text-sm">{stage.count}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">({stage.pct}%)</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-surface-2 rounded-full overflow-hidden border border-white/5">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
            <span className="text-xs text-muted-foreground font-semibold block">Accepted Offers</span>
            <span className="text-2xl font-extrabold text-primary font-mono mt-1 block">
              {stageCounts["accepted"] || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Signed corporate contracts</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
            <span className="text-xs text-muted-foreground font-semibold block">Offers Extended</span>
            <span className="text-2xl font-extrabold text-violet-400 font-mono mt-1 block">
              {stageCounts["offer_extended"] || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Awaiting candidate sign-off</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
            <span className="text-xs text-muted-foreground font-semibold block">Archived / Withdrawn</span>
            <span className="text-2xl font-extrabold text-zinc-400 font-mono mt-1 block">
              {(stageCounts["rejected"] || 0) + (stageCounts["withdrawn"] || 0)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">Cooldown or dropped out</span>
          </div>
        </div>
      </div>

      {/* Grid: AI Score Distribution & Roles Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl p-6 md:p-8 space-y-5">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> AI Assessment Fluency Tiers
          </h2>
          <div className="space-y-4">
            {scoreBuckets.map(({ label, count, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-semibold">{label}</span>
                  <span className="font-mono font-bold text-white">{count} candidates</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden border border-white/5">
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
        <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl p-6 md:p-8 space-y-5">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Users className="size-4 text-primary" /> Talent Demand by Corporate Account
          </h2>
          <div className="space-y-3">
            {allOffers.map((o) => {
              const count = allApps.filter((a) => a.offer_id === o.id).length;
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white block truncate">{o.title}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{o.company}</span>
                  </div>
                  <span className="font-bold font-mono px-2.5 py-1 rounded-full bg-surface-2 border border-white/10 text-primary shrink-0">
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
    <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="grid size-8 place-items-center rounded-xl bg-surface-2 border border-white/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <div className={cn("font-display text-3xl font-extrabold tracking-tight", color)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
