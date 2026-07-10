import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Loader2, FileText, Phone, Mail, MessageCircle, MapPin,
  Calendar, ExternalLink, RefreshCw, Star, User, Briefcase,
  Clock, ChevronLeft, Send, Copy, CheckCheck, Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminGetApplication, adminGetSignedUrl,
  adminUpdateApplicationStatus, adminRescore,
} from "@/lib/applications.functions";
import { ScorePill } from "@/components/score-pill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/applicants/$id")({
  head: () => ({ meta: [{ title: "Applicant — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: ApplicantDetail,
});

const STATUS_STYLES = {
  new: { label: "New", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  shortlisted: { label: "Shortlisted", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  hired: { label: "Hired", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600 border-red-200" },
} as const;

function waMsg(name: string, role: string, company: string) {
  return `Hi ${name}, this is the QuickHire recruitment team. We're reaching out regarding your application for the ${role} role at ${company}. Are you available for a quick call today?`;
}

function interviewMsg(name: string, role: string, company: string, date?: string) {
  return `Hi ${name}! Great news — you've been shortlisted for the ${role} position at ${company}. We'd like to schedule an interview${date ? ` for ${date}` : ""}. Please confirm your availability. Thanks, QuickHire Team`;
}

function calendarLink(name: string, role: string, company: string) {
  const title = encodeURIComponent(`Interview: ${name} — ${role} @ ${company}`);
  const details = encodeURIComponent(`Candidate: ${name}\nRole: ${role}\nCompany: ${company}\n\nScheduled via QuickHire`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
}

function ApplicantDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery({
    queryKey: ["admin", "application", id],
    queryFn: () => adminGetApplication({ data: { id } }),
  });

  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState("");

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

  const rescore = useMutation({
    mutationFn: () => adminRescore({ data: { id } }),
    onSuccess: () => {
      toast.success("Re-scoring started");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["admin", "application", id] }), 3000);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Copied to clipboard");
    });
  }

  if (isLoading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!app) return <div className="p-10 text-center text-muted-foreground">Application not found</div>;

  const role = app.offer?.title ?? "the role";
  const company = app.offer?.company ?? "QuickHire";

  return (
    <div className="px-6 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <Link to="/admin/applicants" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 group">
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to applicants
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
              {app.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">{app.full_name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="size-3.5" />{app.email}
                </a>
                <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="size-3.5" />{app.phone}
                </a>
                {app.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{app.location}</span>}
              </div>
              <div className="mt-2 text-sm">
                Applied for <b>{role}</b> at <b>{company}</b>
                {app.created_at && <span className="ml-2 text-muted-foreground">· {new Date(app.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/${app.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waMsg(app.full_name, role, company))}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <a
            href={`mailto:${app.email}?subject=${encodeURIComponent(`Your application for ${role} — QuickHire`)}&body=${encodeURIComponent(`Hi ${app.full_name},\n\nThank you for applying for the ${role} role at ${company} through QuickHire.\n\n`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-blue-700 transition-colors"
          >
            <Mail className="size-4" /> Email
          </a>
          <a
            href={`tel:${app.phone}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-sand transition-colors"
          >
            <Phone className="size-4" /> Call
          </a>
          <button
            onClick={() => rescore.mutate()}
            disabled={rescore.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-sand transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("size-4", rescore.isPending && "animate-spin")} /> Re-score
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <ScoreCard label="English Fluency" score={app.english_score} max={10} />
        <ScoreCard label="Communication" score={app.comm_score} max={10} />
        <ScoreCard label="Experience" score={app.exp_score} max={10} />
        <div className="rounded-2xl bg-hero p-5 text-primary-foreground shadow-lift">
          <div className="text-[10px] uppercase tracking-widest opacity-80 mb-2">Total Score</div>
          <div className="font-display text-4xl font-bold">
            {app.total_score ?? "—"}
            <span className="text-base opacity-70">/30</span>
          </div>
          <div className="mt-2 text-xs opacity-80 capitalize">Scoring: {app.scoring_status}</div>
          {app.total_score != null && (
            <div className="mt-2 text-xs font-semibold">
              {app.total_score >= 24 ? "🎯 Excellent candidate" : app.total_score >= 18 ? "👍 Good candidate" : "🔍 Needs review"}
            </div>
          )}
        </div>
      </div>

      {/* AI Notes */}
      {app.ai_notes && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="size-4 text-amber-600" />
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">AI Analysis</div>
          </div>
          <p className="whitespace-pre-line text-sm text-amber-900 leading-relaxed">{app.ai_notes}</p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-5">
          {/* Candidate info */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg mb-4 flex items-center gap-2"><User className="size-4 text-primary" /> Candidate Info</h2>
            <dl className="space-y-3 text-sm">
              {[
                { label: "Age", value: app.age ? `${app.age} years` : "—" },
                { label: "English level", value: app.english_level ?? "—" },
                { label: "Experience", value: app.experience_years != null ? `${app.experience_years} year(s)` : "—" },
                { label: "Graduation", value: app.grad_status ?? "—" },
                { label: "Salary expectation", value: app.salary_expectation ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Application answers */}
          {app.answers && Object.keys(app.answers).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg mb-4">Application Answers</h2>
              <dl className="space-y-3 text-sm">
                {Object.entries(app.answers).filter(([, v]) => v).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                      {key.replace(/_/g, " ")}
                    </dt>
                    <dd className="text-ink">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* CV */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg mb-3 flex items-center gap-2"><FileText className="size-4 text-primary" /> CV / Resume</h2>
            {app.cv_path ? (
              <SignedLink bucket="cvs" path={app.cv_path} label="Download CV" />
            ) : (
              <div className="text-sm text-muted-foreground">No CV uploaded</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Voice notes */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg mb-4">Voice Notes</h2>
            <div className="space-y-4">
              {(app.voice_notes ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No voice notes submitted</div>
              ) : (app.voice_notes ?? []).map((v) => (
                <div key={v.path} className="rounded-xl bg-sand p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">{v.lang}</span>
                  </div>
                  <SignedAudio path={v.path} />
                  {app.transcripts?.[v.lang] && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transcript</div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">"{app.transcripts[v.lang]}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick contact shortcuts */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg mb-4 flex items-center gap-2">
              <Send className="size-4 text-primary" /> Quick Contact Shortcuts
            </h2>
            <div className="space-y-2">
              {/* WhatsApp templates */}
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">WhatsApp Messages</div>
              {[
                { label: "Initial outreach", msg: waMsg(app.full_name, role, company) },
                { label: "Interview invite", msg: interviewMsg(app.full_name, role, company, interviewDate || undefined) },
                { label: "Offer confirmation", msg: `Hi ${app.full_name}, congratulations! We're pleased to confirm your selection for the ${role} position at ${company}. Please reply to confirm your acceptance.` },
              ].map(({ label, msg }) => (
                <div key={label} className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${app.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="size-3.5 shrink-0" /> {label}
                  </a>
                  <button
                    onClick={() => copyToClipboard(msg, label)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-sand transition-colors"
                    title="Copy message"
                  >
                    {copied === label ? <CheckCheck className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              ))}

              {/* Email templates */}
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 mt-4">Email Templates</div>
              {[
                {
                  label: "Shortlist notification",
                  subject: `Great news about your ${role} application — QuickHire`,
                  body: `Hi ${app.full_name},\n\nCongratulations! You've been shortlisted for the ${role} role at ${company}.\n\nOur team will be in touch shortly to discuss the next steps.\n\nBest regards,\nQuickHire Recruitment Team`,
                },
                {
                  label: "Interview scheduling",
                  subject: `Interview invitation — ${role} at ${company}`,
                  body: `Hi ${app.full_name},\n\nWe're pleased to invite you for an interview for the ${role} position at ${company}.\n\nPlease reply with your availability for the coming week.\n\nBest regards,\nQuickHire Recruitment Team`,
                },
              ].map(({ label, subject, body }) => (
                <a
                  key={label}
                  href={`mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Mail className="size-3.5 shrink-0" /> {label}
                </a>
              ))}

              {/* Google Calendar */}
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 mt-4">Schedule Interview</div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <a
                  href={`${calendarLink(app.full_name, role, company)}${interviewDate ? `&dates=${interviewDate.replace(/[-:T]/g, "").slice(0, 15)}/${interviewDate.replace(/[-:T]/g, "").slice(0, 15)}` : ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors whitespace-nowrap"
                >
                  <Calendar className="size-3.5" /> Add to Calendar
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg mb-4">Recruitment Decision</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {(["new", "shortlisted", "hired", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => update.mutate({ status: s })}
              disabled={update.isPending}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                app.status === s
                  ? STATUS_STYLES[s].cls + " shadow-soft scale-105"
                  : "border-border bg-card hover:bg-sand text-muted-foreground hover:text-foreground",
              )}
            >
              {STATUS_STYLES[s].label}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Internal notes (auto-saved on blur)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (app.admin_notes ?? "") && update.mutate({ admin_notes: notes })}
            placeholder="Add notes about this candidate — these are private and only visible to the admin team…"
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, max }: { label: string; score: number | null; max: number }) {
  const pct = score != null ? (score / max) * 100 : 0;
  const color = score == null ? "text-muted-foreground" :
    score >= max * 0.8 ? "text-emerald-600" :
    score >= max * 0.6 ? "text-amber-600" : "text-red-500";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{label}</div>
      <div className={`font-display text-3xl font-bold ${color}`}>
        {score ?? "—"}
        <span className="text-sm text-muted-foreground">/{max}</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all",
            score == null ? "" :
            score >= max * 0.8 ? "bg-emerald-500" :
            score >= max * 0.6 ? "bg-amber-500" : "bg-red-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground"><ScorePill score={score} /></div>
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
    <a
      href={data.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
    >
      <FileText className="size-4" /> {label}
      <ExternalLink className="size-3.5 ml-0.5" />
    </a>
  );
}

function SignedAudio({ path }: { path: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["signed", "voice-notes", path],
    queryFn: () => adminGetSignedUrl({ data: { bucket: "voice-notes", path } }),
  });
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading audio…</div>;
  if (!data?.url) return <div className="text-xs text-destructive">Audio unavailable</div>;
  return <audio src={data.url} controls className="mt-1 w-full rounded-lg"><track kind="captions" /></audio>;
}
