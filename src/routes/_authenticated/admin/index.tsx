import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, LogOut, ArrowRight, ShieldAlert, Loader2 } from "lucide-react";
import { adminListOffers } from "@/lib/offers.functions";
import { adminListApplications } from "@/lib/applications.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — HireEgypt" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const offers = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });
  const apps = useQuery({ queryKey: ["admin", "applications"], queryFn: () => adminListApplications({ data: {} }) });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const forbidden = offers.error?.message?.includes("Forbidden") || apps.error?.message?.includes("Forbidden");
  if (forbidden) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <h1 className="mt-4 font-display text-2xl">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account isn't marked as an admin. Ask the site owner to grant admin access.
        </p>
        <button onClick={signOut} className="mt-6 rounded-md border border-input px-4 py-2 text-sm">Sign out</button>
      </div>
    );
  }

  if (offers.isLoading || apps.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  const total = apps.data?.length ?? 0;
  const shortlisted = apps.data?.filter((a) => a.status === "shortlisted").length ?? 0;
  const pending = apps.data?.filter((a) => a.scoring_status !== "done").length ?? 0;
  const activeOffers = offers.data?.filter((o) => o.status === "active").length ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← HireEgypt</Link>
          <h1 className="mt-1 font-display text-3xl">Admin dashboard</h1>
        </div>
        <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          <LogOut className="size-4" /> Sign out
        </button>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Active offers" value={activeOffers} />
        <Stat label="Total applications" value={total} />
        <Stat label="Shortlisted" value={shortlisted} tone="gold" />
        <Stat label="Pending scoring" value={pending} tone="muted" />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Link
          to="/admin/applicants"
          className="group flex items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div>
            <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <h2 className="mt-4 font-display text-xl">Applicants</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review ranked shortlists, play voice notes and contact via WhatsApp.</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground transition group-hover:text-primary" />
        </Link>
        <Link
          to="/admin/offers"
          className="group flex items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div>
            <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="size-5" />
            </div>
            <h2 className="mt-4 font-display text-xl">Job offers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage the {activeOffers} live offers on the board.</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground transition group-hover:text-primary" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "gold" | "muted" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl ${tone === "gold" ? "text-gold-foreground" : tone === "muted" ? "text-muted-foreground" : "text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
