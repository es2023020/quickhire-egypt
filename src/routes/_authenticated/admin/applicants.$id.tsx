import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, FileText, Phone, Mail, MessageCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  adminGetApplication,
  adminGetSignedUrl,
  adminUpdateApplicationStatus,
} from "@/lib/applications.functions";
import { ScorePill } from "@/components/score-pill";

export const Route = createFileRoute("/_authenticated/admin/applicants/$id")({
  head: () => ({ meta: [{ title: "Applicant — HireEgypt Admin" }, { name: "robots", content: "noindex" }] }),
  component: ApplicantDetail,
});

function ApplicantDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery({
    queryKey: ["admin", "application", id],
    queryFn: () => adminGetApplication({ data: { id } }),
  });

  const [notes, setNotes] = useState("");
  useEffect(() => { if (app) setNotes(app.admin_notes ?? ""); }, [app]);

  const update = useMutation({
    mutationFn: (patch: { status?: "new" | "shortlisted" | "rejected" | "hired"; admin_notes?: string }) =>
      adminUpdateApplicationStatus({ data: { id, ...patch } }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  if (!app) return <div className="p-10 text-center">Not found</div>;

  const waLink = (phone: string, msg: string) =>
    `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`;
  const message = `Hi ${app.full_name}, this is HireEgypt regarding your application for ${app.offer?.title ?? "the role"}. Are you available for a quick chat?`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <Link to="/admin/applicants" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Applicants</Link>
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{app.full_name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{app.email}</span>
            <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{app.phone}</span>
            {app.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{app.location}</span>}
          </div>
          <div className="mt-2 text-sm">
            Applied for <b>{app.offer?.title}</b> at <b>{app.offer?.company}</b>
          </div>
        </div>
        <a
          href={waLink(app.phone, message)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground shadow-soft hover:opacity-90"
        >
          <MessageCircle className="size-4" /> Contact on WhatsApp
        </a>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">English</div>
          <div className="mt-1"><ScorePill score={app.english_score} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Communication</div>
          <div className="mt-1"><ScorePill score={app.comm_score} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Experience</div>
          <div className="mt-1"><ScorePill score={app.exp_score} /></div>
        </div>
        <div className="rounded-2xl bg-hero p-4 text-primary-foreground shadow-lift">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Total</div>
          <div className="mt-1 font-display text-3xl">{app.total_score ?? "—"}<span className="text-sm opacity-70">/30</span></div>
          <div className="text-xs opacity-80">Scoring: {app.scoring_status}</div>
        </div>
      </section>

      {app.ai_notes && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AI notes</div>
          <p className="mt-2 whitespace-pre-line text-sm">{app.ai_notes}</p>
        </section>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg">CV</h2>
          {app.cv_path ? (
            <SignedLink bucket="cvs" path={app.cv_path} label="Download CV" />
          ) : <div className="mt-2 text-sm text-muted-foreground">No CV uploaded</div>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg">Voice notes</h2>
          <div className="mt-2 space-y-3">
            {(app.voice_notes ?? []).length === 0 && <div className="text-sm text-muted-foreground">None</div>}
            {(app.voice_notes ?? []).map((v) => (
              <div key={v.path}>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">{v.lang}</div>
                <SignedAudio path={v.path} />
                {app.transcripts?.[v.lang] && (
                  <p className="mt-1 rounded-md bg-sand p-2 text-xs text-muted-foreground">"{app.transcripts[v.lang]}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg">Decision</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["shortlisted", "rejected", "hired", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => update.mutate({ status: s })}
              disabled={update.isPending}
              className={`rounded-md border px-3 py-1.5 text-sm ${app.status === s ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (app.admin_notes ?? "") && update.mutate({ admin_notes: notes })}
          placeholder="Internal notes about this candidate…"
          rows={4}
          className="mt-4 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </section>
    </div>
  );
}

function SignedLink({ bucket, path, label }: { bucket: "cvs" | "voice-notes"; path: string; label: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["signed", bucket, path],
    queryFn: () => adminGetSignedUrl({ data: { bucket, path } }),
  });
  if (isLoading) return <div className="mt-2 text-sm text-muted-foreground">Loading…</div>;
  if (!data?.url) return <div className="mt-2 text-sm text-destructive">Unavailable</div>;
  return (
    <a href={data.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      <FileText className="size-4" /> {label}
    </a>
  );
}

function SignedAudio({ path }: { path: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["signed", "voice-notes", path],
    queryFn: () => adminGetSignedUrl({ data: { bucket: "voice-notes", path } }),
  });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading audio…</div>;
  if (!data?.url) return <div className="text-xs text-destructive">Unavailable</div>;
  return <audio src={data.url} controls className="mt-1 w-full"><track kind="captions" /></audio>;
}
