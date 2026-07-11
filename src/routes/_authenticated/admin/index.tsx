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
  head: () => ({ meta: [{ title: "Dashboard — Talent Bridge Egypt Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

const STATUS_CONFIG = {
  new: { label: "New", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60" },
  shortlisted: { label: "Shortlisted", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60" },
  hired: { label: "Hired", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 ring-1 ring-red-200/60" },
} as const;

function AdminDashboard() {
  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });
  const apps = useQuery({ queryKey: ["admin", "applications"], queryFn: () => adminListApplications({ data: {} }) });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => adminStats() });

  if (apps.isLoading || offers.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
    { label: "Total Applications", value: total, icon: Users, color: "text-primary", bg: "bg-primary/8", trend: `+${todayApps} today` },
    { label: "Shortlisted", value: shortlisted, icon: Star, color: "text-amber-600", bg: "bg-amber-50", trend: total ? `${Math.round(shortlisted / total * 100)}% rate` : "0% rate" },
    { label: "Hired", value: hired, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", trend: total ? `${Math.round(hired / total * 100)}% close` : "" },
    { label: "Active Offers", value: activeOffers, icon: Briefcase, color: "text-primary", bg: "bg-primary/8", trend: `${offers.data?.length ?? 0} total` },
    { label: "New Today", value: todayApps, icon: Clock, color: "text-violet-600", bg: "bg-violet-50", trend: "last 24 hrs" },
    { label: "Avg AI Score", value: `${avgScore}/30`, icon: Target, color: "text-orange-600", bg: "bg-orange-50", trend: `${scored.length} scored` },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px]">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Activity className="size-3" /> Live
          </div>
          <Link
            to="/admin/applicants"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-sand transition-colors"
          >
            <Users className="size-3.5" /> All applicants
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon, color, bg, trend }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("grid size-8 place-items-center rounded-lg", bg)}>
                <Icon className={cn("size-4", color)} />
              </div>
            </div>
            <div className={cn("font-display text-2xl font-bold leading-none", color)}>{value}</div>
            <div className="mt-1 text-[11px] font-medium text-muted-foreground leading-tight">{label}</div>
            {trend && <div className="mt-1 text-[10px] text-muted-foreground/70">{trend}</div>}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Recent applications — spans 2 cols */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Recent Applications</h2>
            <Link to="/admin/applicants" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50 overflow-x-auto">
            {recentApps.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">No applications yet</div>
            ) : recentApps.map((a) => (
              <Link
                key={a.id}
                to="/admin/applicants/$id"
                params={{ id: a.id }}
                className="flex min-w-0 items-center gap-3 px-5 py-3 hover:bg-[#f8f9fb] transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {a.full_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{a.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.offer?.title ?? "—"} · {a.offer?.company}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.total_score != null && (
                    <span className="hidden font-display text-sm font-bold text-primary sm:block">{a.total_score}/30</span>
                  )}
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.cls ?? "bg-sand text-muted-foreground",
                  )}>
                    {STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.label ?? a.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Top scored */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-ink flex items-center gap-1.5">
                <TrendingUp className="size-4 text-amber-500" /> Top Scored
              </h2>
            </div>
            <div className="divide-y divide-border/50">
              {topApps.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground">No scored candidates</div>
              ) : topApps.map((a, i) => (
                <Link
                  key={a.id}
                  to="/admin/applicants/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8f9fb] transition-colors"
                >
                  <div className={cn(
                    "size-5 shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold",
                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-sand text-muted-foreground",
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold text-ink">{a.full_name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{a.offer?.title}</div>
                  </div>
                  <div className="font-display text-sm font-bold text-primary shrink-0">{a.total_score}<span className="text-xs font-normal text-muted-foreground">/30</span></div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-4">
            <h2 className="font-display text-sm font-semibold text-ink mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
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
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-[#f8f9fb] px-3 py-3 text-center hover:bg-sand hover:border-primary/20 hover:text-primary transition-all"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-4">
            <h2 className="font-display text-sm font-semibold text-ink mb-3">Status Breakdown</h2>
            <div className="space-y-2.5">
              {[
                { label: "New / Pending", count: newCount, color: "bg-blue-500", pct: total ? (newCount / total) * 100 : 0 },
                { label: "Shortlisted", count: shortlisted, color: "bg-amber-400", pct: total ? (shortlisted / total) * 100 : 0 },
                { label: "Hired", count: hired, color: "bg-emerald-500", pct: total ? (hired / total) * 100 : 0 },
                { label: "Rejected", count: rejected, color: "bg-red-400", pct: total ? (rejected / total) * 100 : 0 },
              ].map(({ label, count, color, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className="text-[11px] font-bold text-ink">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border/60 overflow-hidden">
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
