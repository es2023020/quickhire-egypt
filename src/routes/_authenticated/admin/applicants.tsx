import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Loader2, Users, ChevronRight, Search, Filter, Download,
  MessageCircle, Mail, Phone, Star, TrendingUp, Clock,
  CheckCircle2, XCircle, ArrowUpDown, RefreshCw,
} from "lucide-react";
import { adminListApplications, adminUpdateApplicationStatus } from "@/lib/applications.functions";
import { adminListOffers } from "@/lib/offers.functions";
import { ScorePill } from "@/components/score-pill";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/applicants")({
  head: () => ({ meta: [{ title: "Applicants — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: Applicants,
});

const STATUS_STYLES = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  shortlisted: "bg-amber-100 text-amber-700 border-amber-200",
  hired: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-600 border-red-200",
} as const;

const STATUS_LABELS = {
  new: "New",
  shortlisted: "Shortlisted ⭐",
  hired: "Hired ✓",
  rejected: "Rejected",
} as const;

function waLink(phone: string, name: string, role: string) {
  const msg = `Hi ${name}, this is QuickHire regarding your application for ${role}. Are you available for a quick call?`;
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`;
}

function emailLink(email: string, name: string, role: string) {
  const subject = encodeURIComponent(`Your application for ${role} — QuickHire`);
  const body = encodeURIComponent(`Hi ${name},\n\nThank you for applying for the ${role} role through QuickHire.\n\nWe have reviewed your application and would like to move forward.\n\nBest regards,\nQuickHire Recruitment Team`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function Applicants() {
  const qc = useQueryClient();
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "date" | "name">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });
  const apps = useQuery({
    queryKey: ["admin", "applications", offerFilter, status],
    queryFn: () => adminListApplications({
      data: {
        offer_id: offerFilter === "all" ? null : offerFilter,
        status: status === "all" ? null : status,
      },
    }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: "new" | "shortlisted" | "rejected" | "hired" }) =>
      adminUpdateApplicationStatus({ data: { id, status: s } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rows = useMemo(() => {
    let list = apps.data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.offer?.title ?? "").toLowerCase().includes(q) ||
        a.phone.includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      let v = 0;
      if (sortBy === "score") v = (a.total_score ?? -1) - (b.total_score ?? -1);
      else if (sortBy === "date") v = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else v = a.full_name.localeCompare(b.full_name);
      return sortDir === "desc" ? -v : v;
    });
    return list;
  }, [apps.data, search, sortBy, sortDir]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  const total = rows.length;
  const shortlisted = (apps.data ?? []).filter(a => a.status === "shortlisted").length;

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <Users className="size-7 text-primary" /> Applicants
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} candidate{total !== 1 ? "s" : ""} · {shortlisted} shortlisted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "applications"] })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring shadow-soft"
          />
        </div>
        <select
          value={offerFilter}
          onChange={(e) => setOfferFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring shadow-soft"
        >
          <option value="all">All offers</option>
          {offers.data?.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring shadow-soft"
        >
          <option value="all">All statuses</option>
          {["new", "shortlisted", "hired", "rejected"].map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {apps.isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Users className="size-10 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">No applicants match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground">
                      Candidate <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">English</th>
                  <th className="px-4 py-3">Comm</th>
                  <th className="px-4 py-3">Exp</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort("score")} className="flex items-center gap-1 hover:text-foreground">
                      Total <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground">
                      Date <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-sand/40 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {a.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{a.full_name}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink font-medium">{a.offer?.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.offer?.company}</div>
                    </td>
                    <td className="px-4 py-3"><ScorePill score={a.english_score} /></td>
                    <td className="px-4 py-3"><ScorePill score={a.comm_score} /></td>
                    <td className="px-4 py-3"><ScorePill score={a.exp_score} /></td>
                    <td className="px-4 py-3">
                      <span className={cn("font-display text-lg font-bold",
                        a.total_score == null ? "text-muted-foreground" :
                        a.total_score >= 24 ? "text-emerald-600" :
                        a.total_score >= 18 ? "text-amber-600" : "text-red-500"
                      )}>
                        {a.total_score != null ? `${a.total_score}/30` : a.scoring_status === "pending" ? "…" : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus.mutate({ id: a.id, s: e.target.value as "new" | "shortlisted" | "rejected" | "hired" })}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none appearance-none",
                          STATUS_STYLES[a.status as keyof typeof STATUS_STYLES] ?? "bg-sand text-muted-foreground border-border",
                        )}
                      >
                        {["new", "shortlisted", "hired", "rejected"].map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={waLink(a.phone, a.full_name, a.offer?.title ?? "the role")}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp"
                          className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                        <a
                          href={emailLink(a.email, a.full_name, a.offer?.title ?? "the role")}
                          title="Email"
                          className="grid size-7 place-items-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          <Mail className="size-3.5" />
                        </a>
                        <a
                          href={`tel:${a.phone}`}
                          title="Call"
                          className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Phone className="size-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/applicants/$id"
                        params={{ id: a.id }}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/5 border border-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Open <ChevronRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
