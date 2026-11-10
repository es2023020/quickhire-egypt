import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Users, ArrowRight, Loader2,
  TrendingUp, Clock, CheckCircle2, Zap, Star,
  Activity, Calendar, BarChart3, Target,
} from "lucide-react";
import { adminListOffers } from "@/lib/offers.functions";
import { adminListApplications, adminStats } from "@/lib/applications.functions";
import { ScorePill } from "@/components/score-pill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

const STATUS_CONFIG = {
  new: { label: "New", cls: "bg-surface-3 text-zinc-200 border-white/10" },
  shortlisted: { label: "Shortlisted", cls: "bg-primary/15 text-primary border-primary/30" },
  hired: { label: "Hired", cls: "bg-primary text-primary-foreground font-bold border-transparent" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
} as const;

function AdminDashboard() {
  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });
  const apps = useQuery({ queryKey: ["admin", "applications"], queryFn: () => adminListApplications({ data: {} }) });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => adminStats() });

  if (apps.isLoading || offers.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const allApps = apps.data ?? [];
  const total = allApps.length;
  const shortlisted = allApps.filter((a) => a.status === "shortlisted").length;
  const hired = allApps.filter((a) => a.status === "hired").length;
  const rejected = allApps.filter((a) => a.status === "rejected").length;
  const newCount = allApps.filter((a) => a.status === "new").length;
  const activeOffers = offers.data?.filter((o) => o.status === "active").length ?? 0;
  const todayApps = stats.data?.today ?? 0;
  const scored = allApps.filter(a => a.total_score != null);
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + (a.total_score ?? 0), 0) / scored.length) : 0;

  const recentApps = [...allApps]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const topApps = [...allApps]
    .filter(a => a.total_score != null)
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 5);

  const statCards = [
    { label: "Total Applications", value: total, icon: Users, color: "text-white", bg: "bg-surface-3", trend: `+${todayApps} today` },
    { label: "Shortlisted", value: shortlisted, icon: Star, color: "text-primary", bg: "bg-primary/10", trend: total ? `${Math.round(shortlisted / total * 100)}% rate` : "0% rate" },
    { label: "Hired", value: hired, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", trend: total ? `${Math.round(hired / total * 100)}% close` : "" },
    { label: "Active Offers", value: activeOffers, icon: Briefcase, color: "text-white", bg: "bg-surface-3", trend: `${offers.data?.length ?? 0} total` },
    { label: "New Today", value: todayApps, icon: Clock, color: "text-primary", bg: "bg-primary/10", trend: "last 24 hrs" },
    { label: "Avg AI Score", value: `${avgScore}/30`, icon: Target, color: "text-white", bg: "bg-surface-3", trend: `${scored.length} scored` },
  ];

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-[1400px] space-y-8 bg-background text-foreground">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight text-white">
            Operations Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-[0_0_10px_rgba(182,255,46,0.2)]">
            <Activity className="size-3.5" /> Live Sync
          </div>
          <Link
            to="/admin/applicants"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-1 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-surface-2 transition-colors"
          >
            <Users className="size-3.5 text-primary" /> View Applicants
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon, color, bg, trend }) => (
          <div key={label} className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("grid size-9 place-items-center rounded-xl border border-white/10", bg)}>
                <Icon className={cn("size-4 text-primary")} />
              </div>
            </div>
            <div className={cn("font-display text-3xl font-extrabold leading-none tracking-tight", color)}>{value}</div>
            <div className="mt-2 text-xs font-semibold text-zinc-300 leading-tight">{label}</div>
            {trend && <div className="mt-1 text-[10px] text-muted-foreground font-mono">{trend}</div>}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent applications — spans 2 cols */}
        <div className="lg:col-span-2 flex flex-col rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <h2 className="font-display text-lg font-bold text-white">Recent Candidate Submissions</h2>
            <Link to="/admin/applicants" className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <span>View All</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.06] overflow-x-auto">
            {recentApps.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">No applications logged yet</div>
            ) : recentApps.map((a) => (
              <Link
                key={a.id}
                to="/admin/applicants/$id"
                params={{ id: a.id }}
                className="flex min-w-0 items-center gap-4 px-6 py-4 hover:bg-surface-2/60 transition-colors"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-extrabold">
                  {a.full_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-bold text-white">{a.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground mt-0.5">{a.offer?.title ?? "—"} · {a.offer?.company}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {a.total_score != null && (
                    <span className="hidden font-display text-sm font-bold text-primary sm:block">{a.total_score}/30</span>
                  )}
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                    STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.cls ?? "bg-surface-3 text-muted-foreground",
                  )}>
                    {STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.label ?? a.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Top scored */}
          <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4.5">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Top AI Scored
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {topApps.length === 0 ? (
                <div className="px-6 py-8 text-center text-xs text-muted-foreground">No scored candidates yet</div>
              ) : topApps.map((a, i) => (
                <Link
                  key={a.id}
                  to="/admin/applicants/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3.5 px-6 py-3 hover:bg-surface-2/60 transition-colors"
                >
                  <div className={cn(
                    "size-6 shrink-0 flex items-center justify-center rounded-lg text-xs font-bold border",
                    i === 0 ? "border-primary/40 bg-primary/20 text-primary" : "border-white/10 bg-surface-2 text-zinc-400",
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-bold text-white">{a.full_name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{a.offer?.title}</div>
                  </div>
                  <div className="font-display text-sm font-bold text-primary shrink-0">{a.total_score}<span className="text-xs font-normal text-muted-foreground">/30</span></div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl p-6">
            <h2 className="font-display text-sm font-bold text-white mb-4">Command Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { to: "/admin/offers", icon: Briefcase, label: "Offers" },
                { to: "/admin/applicants", icon: Users, label: "Applicants" },
                { to: "/admin/pipeline", icon: Zap, label: "Pipeline" },
                { to: "/admin/interviews", icon: Calendar, label: "Interviews" },
                { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3 py-3.5 text-center hover:border-primary/40 hover:bg-surface-3 transition-all"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-zinc-200">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl p-6">
            <h2 className="font-display text-sm font-bold text-white mb-4">Pipeline Distribution</h2>
            <div className="space-y-3.5">
              {[
                { label: "New Submissions", count: newCount, color: "bg-surface-3", pct: total ? (newCount / total) * 100 : 0 },
                { label: "Shortlisted", count: shortlisted, color: "bg-primary", pct: total ? (shortlisted / total) * 100 : 0 },
                { label: "Hired", count: hired, color: "bg-primary shadow-[0_0_8px_rgba(182,255,46,0.6)]", pct: total ? (hired / total) * 100 : 0 },
                { label: "Archived / Rejected", count: rejected, color: "bg-red-500", pct: total ? (rejected / total) * 100 : 0 },
              ].map(({ label, count, color, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
