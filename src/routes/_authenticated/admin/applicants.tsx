import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Users, ChevronRight } from "lucide-react";
import { adminListApplications } from "@/lib/applications.functions";
import { adminListOffers } from "@/lib/offers.functions";
import { ScorePill } from "@/components/score-pill";

export const Route = createFileRoute("/_authenticated/admin/applicants")({
  head: () => ({ meta: [{ title: "Applicants — HireEgypt Admin" }, { name: "robots", content: "noindex" }] }),
  component: Applicants,
});

function Applicants() {
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });
  const apps = useQuery({
    queryKey: ["admin", "applications", offerFilter, status],
    queryFn: () =>
      adminListApplications({
        data: {
          offer_id: offerFilter === "all" ? null : offerFilter,
          status: status === "all" ? null : status,
        },
      }),
  });

  const rows = useMemo(() => apps.data ?? [], [apps.data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <h1 className="mt-1 flex items-center gap-2 font-display text-3xl"><Users className="size-6 text-primary" /> Applicants</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">All offers</option>
            {offers.data?.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {["all", "new", "shortlisted", "rejected", "hired"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </header>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {apps.isLoading ? (
          <div className="flex items-center justify-center p-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">No applicants yet for these filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Candidate</th>
                <th className="p-3">Offer</th>
                <th className="p-3">English</th>
                <th className="p-3">Comm</th>
                <th className="p-3">Exp</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-sand/50">
                  <td className="p-3">
                    <div className="font-medium text-foreground">{a.full_name}</div>
                    <div className="text-xs text-muted-foreground">{a.email} · {a.phone}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{a.offer?.title ?? "—"}</td>
                  <td className="p-3"><ScorePill score={a.english_score} /></td>
                  <td className="p-3"><ScorePill score={a.comm_score} /></td>
                  <td className="p-3"><ScorePill score={a.exp_score} /></td>
                  <td className="p-3 font-display text-lg text-primary">{a.total_score ?? (a.scoring_status === "pending" ? "…" : "—")}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-sand px-2 py-0.5 text-xs">{a.status}</span>
                  </td>
                  <td className="p-3">
                    <Link
                      to="/admin/applicants/$id"
                      params={{ id: a.id }}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
