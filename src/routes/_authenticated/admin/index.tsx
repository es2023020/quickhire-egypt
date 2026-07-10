import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Users, ArrowRight, ShieldAlert, Loader2,
  TrendingUp, Clock, CheckCircle2, XCircle, Zap, Star,
  Phone, MessageCircle, Activity, Calendar
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
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  shortlisted: { label: "Shortlisted", color: "bg-amber-100 text-amber-700" },
  hired: { label: "Hired", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600" },
} as const;

function AdminDashboard() {
  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });
  const apps = useQuery({ queryKey: ["admin", "applications"], queryFn: () => adminListApplications({ data: {} }) });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => adminStats() });

  const forbidden = offers.error?.message?.includes("Forbidden") || apps.error?.message?.includes("Forbidden");
  if (forbidden) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center py-20">
        <ShieldAlert className="size-12 text-destructive" />
        <h1 className="mt-4 font-display text-2xl">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Your account doesn't have admin privileges. Ask the site owner to grant admin access via the database.
        </p>
      </div>
    );
  }

  if (offers.isLoading || apps.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  const allApps = apps.data ?? [];
  const total = stats.data?.total ?? allApps.length;
  const shortlisted = allApps.filter((a) => a.status === "shortlisted").length;
  const hired = allApps.filter((a) => a.status === "hired").length;
  const pending = allApps.filter((a) => a.scoring_status !== "done").length;
  const activeOffers = offers.data?.filter((o) => o.status === "active").length ?? 0;
  const todayApps = stats.data?.today ?? 0;

  const recentApps = [...allApps]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const topApps = [...allApps]
    .filter(a => a.total_score != null)
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 5);

  return (
    <div className="px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Activity className="size-3" /> Live
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard icon={Users} label="Total Applications" value={total} color="text-primary" className="lg:col-span-2" />
        <StatCard icon={Star} label="Shortlisted" value={shortlisted} color="text-amber-600" sub={`${total ? Math.round(shortlisted/total*100) : 0}% rate`} />
        <StatCard icon={CheckCircle2} label="Hired" value={hired} color="text-emerald-600" />
        <StatCard icon={Briefcase} label="Active Offers" value={activeOffers} color="text-primary" />
        <StatCard icon={Clock} label="Today" value={todayApps} color="text-blue-600" sub="new applications" />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent applications */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-lg">Recent Applications</h2>
            <Link to="/admin/applicants" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentApps.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No applications yet</div>
            ) : recentApps.map((a) => (
              <Link
                key={a.id}
                to="/admin/applicants/$id"
                params={{ id: a.id }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-sand/50 transition-colors"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {a.full_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{a.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.offer?.title ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.total_score != null && (
                    <span className="font-display text-sm font-bold text-primary">{a.total_score}/30</span>
                  )}
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.color ?? "bg-sand text-muted-foreground"
                  )}>
                    {STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]?.label ?? a.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Top scored */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-base">Top Scored</h2>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {topApps.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No scored candidates yet</div>
              ) : topApps.map((a, i) => (
                <Link
                  key={a.id}
                  to="/admin/applicants/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50 transition-colors"
                >
                  <div className={cn(
                    "size-6 shrink-0 flex items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-amber-100 text-amber-700" : "bg-sand text-muted-foreground",
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{a.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.offer?.title}</div>
                  </div>
                  <span className="font-display text-sm font-bold text-primary shrink-0">{a.total_score}/30</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
            <h2 className="font-display text-base mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/admin/offers" className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-sand transition-colors">
                <Briefcase className="size-4 text-primary" />
                <span className="text-sm font-medium">Manage job offers</span>
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
              <Link to="/admin/applicants" className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-sand transition-colors">
                <Users className="size-4 text-primary" />
                <span className="text-sm font-medium">Review applicants</span>
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
              <Link to="/admin/pipeline" className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-sand transition-colors">
                <Zap className="size-4 text-primary" />
                <span className="text-sm font-medium">Open pipeline</span>
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
              <Link to="/admin/interviews" className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-sand transition-colors">
                <Calendar className="size-4 text-primary" />
                <span className="text-sm font-medium">Schedule interviews</span>
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
            <h2 className="font-display text-base mb-4">Status Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: "New / Unreviewed", count: allApps.filter(a => a.status === "new").length, color: "bg-blue-500" },
                { label: "Shortlisted", count: shortlisted, color: "bg-amber-500" },
                { label: "Hired", count: hired, color: "bg-emerald-500" },
                { label: "Rejected", count: allApps.filter(a => a.status === "rejected").length, color: "bg-red-400" },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-bold text-ink">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all`}
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
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

function StatCard({
  icon: Icon, label, value, color, sub, className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${className}`}>
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
