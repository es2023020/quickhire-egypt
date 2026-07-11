import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Loader2, FileText, Phone, Mail, MessageCircle, MapPin,
  Calendar, RefreshCw, User, Briefcase, Clock, ChevronLeft,
  Send, Copy, CheckCheck, Zap, Star, ChevronUp, ChevronDown,
  Mic, Share2, Building2, GraduationCap, BadgeCheck, ExternalLink,
  Edit3, Check, X, Globe, Target, BarChart3, Trash2,
  Play, Pause, Download, Save, AlertTriangle, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminGetApplication,
  adminUpdateApplicationStatus,
  adminUpdateApplicant,
  adminRescore,
  adminDeleteApplication,
} from "@/lib/applications.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/applicants/$id")({
  head: () => ({ meta: [{ title: "Applicant — Talent Bridge Egypt Admin" }, { name: "robots", content: "noindex" }] }),
  component: ApplicantDetail,
});

const STATUS_CFG = {
  new: { label: "New", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  shortlisted: { label: "Shortlisted", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  hired: { label: "Hired", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600 border-red-200", dot: "bg-red-500" },
} as const;

function scoreGrade(s: number, max: number) {
  const pct = s / max;
  if (pct >= 0.9) return { label: "Excellent", color: "text-emerald-600", bar: "bg-emerald-500" };
  if (pct >= 0.75) return { label: "Good", color: "text-blue-600", bar: "bg-blue-500" };
  if (pct >= 0.6) return { label: "Average", color: "text-amber-600", bar: "bg-amber-400" };
  return { label: "Below avg", color: "text-red-500", bar: "bg-red-400" };
}

function totalGrade(s: number) {
  if (s >= 27) return { label: "🎯 Exceptional", color: "from-emerald-500 to-emerald-600", badge: "bg-emerald-100 text-emerald-700" };
  if (s >= 24) return { label: "⭐ Excellent", color: "from-primary to-primary/80", badge: "bg-blue-100 text-blue-700" };
  if (s >= 20) return { label: "👍 Good", color: "from-blue-500 to-blue-600", badge: "bg-sky-100 text-sky-700" };
  if (s >= 15) return { label: "🔍 Average", color: "from-amber-500 to-amber-600", badge: "bg-amber-100 text-amber-700" };
  return { label: "⚠️ Below avg", color: "from-red-500 to-red-600", badge: "bg-red-100 text-red-600" };
}

function buildCompanyShareMessage(app: {
  full_name: string; phone: string; email: string; location: string | null;
  age: number | null; grad_status: string | null; english_level: string | null;
  experience_years: number | null; salary_expectation: string | null;
  english_score: number | null; comm_score: number | null; exp_score: number | null;
  total_score: number | null; ai_notes: string | null;
  status: string; transcripts: Record<string, string>;
  answers: Record<string, string | number | boolean | null>;
  offer: { title: string; company: string } | null;
  cv_path: string | null; voice_notes: { lang: string; path: string }[];
}) {
  const role = app.offer?.title ?? "the role";
  const company = app.offer?.company ?? "your company";
  const grade = app.total_score != null ? totalGrade(app.total_score).label : "";

  const lines = [
    `📋 *Candidate Profile — Talent Bridge Egypt*`,
    ``,
    `👤 *${app.full_name}*`,
    `📱 ${app.phone}  |  📧 ${app.email}`,
    app.location ? `📍 ${app.location}` : null,
    app.age ? `🎂 ${app.age} years old` : null,
    ``,
    `🎯 *Applied for:* ${role} @ ${company}`,
    ``,
    `━━━━━━━━━━━━━━`,
    `📊 *AI ASSESSMENT SCORES*`,
    `━━━━━━━━━━━━━━`,
    `🏆 *Total Score: ${app.total_score ?? "—"}/30* ${grade}`,
    `🗣 English Fluency: ${app.english_score ?? "—"}/10`,
    `💬 Communication: ${app.comm_score ?? "—"}/10`,
    `🏢 Experience: ${app.exp_score ?? "—"}/10`,
    ``,
    `━━━━━━━━━━━━━━`,
    `👤 *CANDIDATE DETAILS*`,
    `━━━━━━━━━━━━━━`,
    app.grad_status ? `• Education: ${app.grad_status}` : null,
    app.english_level ? `• English: ${app.english_level}` : null,
    app.experience_years != null ? `• Experience: ${app.experience_years} year(s)` : null,
    app.salary_expectation ? `• Salary target: ${Number(app.salary_expectation).toLocaleString()} EGP/month` : null,
    ...Object.entries(app.answers ?? {}).filter(([, v]) => v).map(([k, v]) => `• ${k.replace(/_/g, " ")}: ${v}`),
    ``,
  ];

  if (app.ai_notes) {
    lines.push(`━━━━━━━━━━━━━━`, `🤖 *AI ANALYSIS*`, `━━━━━━━━━━━━━━`, `"${app.ai_notes}"`, ``);
  }

  const transcriptEntries = Object.entries(app.transcripts ?? {});
  if (transcriptEntries.length > 0) {
    lines.push(`━━━━━━━━━━━━━━`, `🎙 *VOICE NOTE TRANSCRIPTS*`, `━━━━━━━━━━━━━━`);
    transcriptEntries.forEach(([lang, text]) => {
      lines.push(`[${lang}]: "${text}"`);
    });
    lines.push(``);
  }

  lines.push(
    app.cv_path ? `📎 *CV on file ✓*` : `📎 No CV uploaded`,
    app.voice_notes?.length ? `🎙 *${app.voice_notes.length} Voice note(s) on file ✓*` : `🎙 No voice notes`,
    ``,
    `Powered by *Talent Bridge Egypt* 🇪🇬`,
    `Egypt's Premier Talent & Recruitment Platform`,
  );

  return lines.filter((l) => l !== null).join("\n");
}

function buildCandidateWaMsg(name: string, role: string, company: string) {
  return `Hi ${name}! This is the Talent Bridge Egypt recruitment team. We're reaching out regarding your application for the *${role}* position at *${company}*. Are you available for a quick call today?`;
}

function buildInterviewMsg(name: string, role: string, company: string) {
  return `Hi ${name}! 🎉 Great news — you've been *shortlisted* for the *${role}* role at *${company}*! We'd like to schedule an interview. Please reply with your available time slots this week. Thanks, Talent Bridge Egypt Team 🚀`;
}

function buildOfferMsg(name: string, role: string, company: string) {
  return `Hi ${name}! Congratulations! 🎊 We're delighted to confirm your selection for the *${role}* position at *${company}*. Please reply to confirm your acceptance and we'll share the next steps. Welcome aboard! — Talent Bridge Egypt Team`;
}

function buildRejectionMsg(name: string, role: string) {
  return `Hi ${name}, thank you for applying for the *${role}* role through Talent Bridge Egypt. After careful review, we're unable to move forward with your application at this time. We'll keep your profile for future opportunities. Best of luck! — Talent Bridge Egypt Team`;
}

function waNumber(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits.startsWith("+") ? digits.slice(1) : digits;
}

function ApplicantDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery({
    queryKey: ["admin", "application", id],
    queryFn: () => adminGetApplication({ data: { id } }),
  });

  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<"english" | "comm" | "exp" | null>(null);
  const [scoreEdits, setScoreEdits] = useState<{ english: number; comm: number; exp: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<{
    full_name: string; email: string; phone: string;
    age: string; location: string; grad_status: string;
    english_level: string; experience_years: string; salary_expectation: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (app) {
      setNotes(app.admin_notes ?? "");
      setScoreEdits({
        english: app.english_score ?? 0,
        comm: app.comm_score ?? 0,
        exp: app.exp_score ?? 0,
      });
      setEditFields({
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        age: app.age != null ? String(app.age) : "",
        location: app.location ?? "",
        grad_status: app.grad_status ?? "",
        english_level: app.english_level ?? "",
        experience_years: app.experience_years != null ? String(app.experience_years) : "",
        salary_expectation: app.salary_expectation ?? "",
      });
    }
  }, [app]);

  const update = useMutation({
    mutationFn: (patch: Parameters<typeof adminUpdateApplicationStatus>[0]["data"]) =>
      adminUpdateApplicationStatus({ data: { id, ...patch } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setEditingScore(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateProfile = useMutation({
    mutationFn: (data: Parameters<typeof adminUpdateApplicant>[0]["data"]) =>
      adminUpdateApplicant({ data }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      setEditMode(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rescore = useMutation({
    mutationFn: () => adminRescore({ data: { id } }),
    onSuccess: () => {
      toast.success("Re-scored by AI");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteApp = useMutation({
    mutationFn: () => adminDeleteApplication({ data: { id } }),
    onSuccess: () => {
      toast.success("Applicant deleted");
      navigate({ to: "/admin/applicants" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
      toast.success("Copied!");
    });
  }

  function saveScores() {
    if (!scoreEdits) return;
    update.mutate({
      english_score: scoreEdits.english,
      comm_score: scoreEdits.comm,
      exp_score: scoreEdits.exp,
    });
  }

  function saveProfile() {
    if (!editFields) return;
    updateProfile.mutate({
      id,
      full_name: editFields.full_name,
      email: editFields.email,
      phone: editFields.phone,
      age: editFields.age ? Number(editFields.age) : null,
      location: editFields.location || null,
      grad_status: editFields.grad_status || null,
      english_level: editFields.english_level || null,
      experience_years: editFields.experience_years ? Number(editFields.experience_years) : null,
      salary_expectation: editFields.salary_expectation || null,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!app) {
    return <div className="p-10 text-center text-muted-foreground">Application not found.</div>;
  }

  const role = app.offer?.title ?? "—";
  const company = app.offer?.company ?? "—";
  const hrPhone = (app.offer as { hr_phone?: string | null } | null)?.hr_phone ?? null;
  const statusCfg = STATUS_CFG[app.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.new;
  const liveEng = scoreEdits?.english ?? app.english_score ?? 0;
  const liveComm = scoreEdits?.comm ?? app.comm_score ?? 0;
  const liveExp = scoreEdits?.exp ?? app.exp_score ?? 0;
  const liveTotal = liveEng + liveComm + liveExp;
  const totalGradeInfo = totalGrade(liveTotal);
  const shareMsg = buildCompanyShareMessage(app);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-5">

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-ink">Delete {app.full_name}?</div>
                <div className="text-xs text-muted-foreground">This cannot be undone.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              All data including scores, voice notes, CV, transcripts and admin notes will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteApp.mutate()}
                disabled={deleteApp.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteApp.isPending && <Loader2 className="size-4 animate-spin" />}
                Delete Permanently
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sand transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <Link to="/admin/applicants" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground group">
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Applicants
      </Link>

      {/* ── HERO CARD ── */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className={cn("h-1.5 w-full bg-gradient-to-r",
          app.status === "hired" ? "from-emerald-500 to-emerald-400" :
          app.status === "shortlisted" ? "from-amber-500 to-amber-400" :
          app.status === "rejected" ? "from-red-500 to-red-400" :
          "from-blue-500 to-blue-400",
        )} />

        <div className="p-5">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            {/* Identity */}
            <div className="flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
                {app.full_name[0]?.toUpperCase()}
              </div>
              <div>
                {editMode && editFields ? (
                  <div className="space-y-2">
                    <input
                      value={editFields.full_name}
                      onChange={e => setEditFields(f => f ? { ...f, full_name: e.target.value } : f)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-lg font-bold text-ink outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Full name"
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={editFields.email}
                        onChange={e => setEditFields(f => f ? { ...f, email: e.target.value } : f)}
                        className="flex-1 min-w-48 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Email"
                        type="email"
                      />
                      <input
                        value={editFields.phone}
                        onChange={e => setEditFields(f => f ? { ...f, phone: e.target.value } : f)}
                        className="flex-1 min-w-40 rounded-lg border border-border px-3 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Phone (auto-prefixed)"
                      />
                    </div>
                    <input
                      value={editFields.location}
                      onChange={e => setEditFields(f => f ? { ...f, location: e.target.value } : f)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Location"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">{app.full_name}</h1>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", statusCfg.cls)}>
                        <span className={cn("size-1.5 rounded-full", statusCfg.dot)} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Mail className="size-3.5" />{app.email}
                      </a>
                      <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors font-mono">
                        <Phone className="size-3.5" />{app.phone}
                      </a>
                      {app.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{app.location}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <Briefcase className="size-3.5 text-muted-foreground" />
                      <span>Applied for <b>{role}</b> at <b>{company}</b></span>
                      {app.created_at && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(app.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {editMode ? (
                <>
                  <button
                    onClick={saveProfile}
                    disabled={updateProfile.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Changes
                  </button>
                  <button
                    onClick={() => { setEditMode(false); }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
                  >
                    <X className="size-4" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
                  >
                    <Edit3 className="size-4" /> Edit Profile
                  </button>
                  <a
                    href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(buildCandidateWaMsg(app.full_name, role, company))}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                  <a
                    href={`mailto:${app.email}?subject=${encodeURIComponent(`Your application for ${role} — Talent Bridge Egypt`)}&body=${encodeURIComponent(`Hi ${app.full_name},\n\nThank you for your application.\n\n`)}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Mail className="size-4" /> Email
                  </a>
                  <a
                    href={`tel:${app.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
                  >
                    <Phone className="size-4" /> Call
                  </a>
                  <button
                    onClick={() => rescore.mutate()}
                    disabled={rescore.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("size-4", rescore.isPending && "animate-spin")} /> Re-score
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="size-4" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCORES SECTION ── */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
            <Target className="size-4 text-primary" /> AI Assessment Scores
          </h2>
          <div className="flex items-center gap-2">
            {editingScore !== null ? (
              <>
                <button
                  onClick={saveScores}
                  disabled={update.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <Check className="size-3.5" /> Save scores
                </button>
                <button
                  onClick={() => {
                    setScoreEdits({ english: app.english_score ?? 0, comm: app.comm_score ?? 0, exp: app.exp_score ?? 0 });
                    setEditingScore(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sand"
                >
                  <X className="size-3.5" /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingScore("english")}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sand hover:text-primary transition-colors"
              >
                <Edit3 className="size-3.5" /> Edit scores
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <ScoreCard
            label="English Fluency"
            score={liveEng}
            max={10}
            editing={editingScore !== null}
            onChange={(v) => { setScoreEdits(s => s ? { ...s, english: v } : s); setEditingScore("english"); }}
          />
          <ScoreCard
            label="Communication"
            score={liveComm}
            max={10}
            editing={editingScore !== null}
            onChange={(v) => { setScoreEdits(s => s ? { ...s, comm: v } : s); setEditingScore("comm"); }}
          />
          <ScoreCard
            label="Experience"
            score={liveExp}
            max={10}
            editing={editingScore !== null}
            onChange={(v) => { setScoreEdits(s => s ? { ...s, exp: v } : s); setEditingScore("exp"); }}
          />
          <div className={cn("rounded-2xl p-5 text-white bg-gradient-to-br shadow-soft flex flex-col", totalGradeInfo.color)}>
            <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Total Score</div>
            <div className="font-display text-4xl font-bold mt-auto">
              {liveTotal}<span className="text-lg opacity-70">/30</span>
            </div>
            <div className="mt-2 text-xs font-semibold opacity-90">{totalGradeInfo.label}</div>
            <div className="mt-1 text-[10px] opacity-70 capitalize">Status: {app.scoring_status}</div>
          </div>
        </div>

        {/* Score bar visual */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "English", val: liveEng },
            { label: "Communication", val: liveComm },
            { label: "Experience", val: liveExp },
          ].map(({ label, val }) => {
            const g = scoreGrade(val, 10);
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-bold", g.color)}>{val}/10 · {g.label}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", g.bar)} style={{ width: `${(val / 10) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI ANALYSIS ── */}
      {app.ai_notes && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-200/60">
              <Zap className="size-4 text-amber-700" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">AI Recommendation</div>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{app.ai_notes}</p>
        </div>
      )}

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Candidate profile */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
              <User className="size-4 text-primary" /> Candidate Profile
            </h2>
            {editMode && editFields ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Age", field: "age" as const, placeholder: "e.g. 26", type: "number" },
                  { label: "English Level", field: "english_level" as const, placeholder: "e.g. C1 Advanced" },
                  { label: "Experience (yrs)", field: "experience_years" as const, placeholder: "e.g. 3", type: "number" },
                  { label: "Education", field: "grad_status" as const, placeholder: "e.g. Graduate" },
                  { label: "Salary Target (EGP)", field: "salary_expectation" as const, placeholder: "e.g. 16000" },
                ].map(({ label, field, placeholder, type }) => (
                  <div key={field} className="rounded-xl bg-[#f8f9fb] p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
                    <input
                      type={type ?? "text"}
                      value={editFields[field] ?? ""}
                      onChange={e => setEditFields(f => f ? { ...f, [field]: e.target.value } : f)}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Star, label: "Age", value: app.age ? `${app.age} yrs` : "—" },
                  { icon: Globe, label: "English Level", value: app.english_level ?? "—" },
                  { icon: Briefcase, label: "Experience", value: app.experience_years != null ? `${app.experience_years} yr${app.experience_years !== 1 ? "s" : ""}` : "—" },
                  { icon: GraduationCap, label: "Education", value: app.grad_status ?? "—" },
                  { icon: DollarSign, label: "Salary Target", value: app.salary_expectation ? `${Number(app.salary_expectation).toLocaleString()} EGP` : "—" },
                  { icon: MapPin, label: "Location", value: app.location ?? "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-[#f8f9fb] p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
                    </div>
                    <div className="text-sm font-semibold text-ink">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application answers */}
          {app.answers && Object.keys(app.answers).length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
              <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
                <BadgeCheck className="size-4 text-primary" /> Application Answers
              </h2>
              <div className="space-y-3">
                {Object.entries(app.answers).filter(([, v]) => v).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border/60 bg-[#f8f9fb] px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm text-ink">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CV Section */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText className="size-4 text-primary" /> CV / Resume
            </h2>
            {app.cv_path ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-[#f8f9fb] p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{app.cv_path.split("/").pop()}</div>
                    <div className="text-xs text-muted-foreground">PDF Document · On file</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="size-3" /> On file
                    </span>
                    <a
                      href={app.cv_path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <ExternalLink className="size-3" /> Open
                    </a>
                    <a
                      href={app.cv_path}
                      download
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <Download className="size-3" /> Download
                    </a>
                  </div>
                </div>
                {/* WhatsApp with CV link */}
                {hrPhone && (
                  <a
                    href={`https://wa.me/${waNumber(hrPhone)}?text=${encodeURIComponent(`Hi, please find the CV for candidate *${app.full_name}* for the *${role}* role.\n\nCV Link: ${app.cv_path}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    Send CV link to Company HR via WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-[#f8f9fb] p-6 text-center">
                <FileText className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No CV uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Voice Notes */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
              <Mic className="size-4 text-primary" /> Voice Notes & Transcripts
            </h2>
            {(app.voice_notes ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-[#f8f9fb] p-6 text-center">
                <Mic className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No voice notes submitted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(app.voice_notes ?? []).map((v, i) => (
                  <VoiceNoteCard
                    key={v.path ?? i}
                    voiceNote={v}
                    index={i}
                    transcript={app.transcripts?.[v.lang] ?? null}
                    onCopy={(text, key) => copyText(text, key)}
                    copied={copied}
                    hrPhone={hrPhone}
                    candidateName={app.full_name}
                    role={role}
                    waNumber={waNumber}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Contact shortcuts for CANDIDATE */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-3 flex items-center gap-2">
              <Send className="size-4 text-primary" /> Contact Candidate
            </h2>

            <div className="space-y-2">
              {[
                { label: "Initial outreach", msg: buildCandidateWaMsg(app.full_name, role, company) },
                { label: "Interview invite", msg: buildInterviewMsg(app.full_name, role, company) },
                { label: "Offer confirmation", msg: buildOfferMsg(app.full_name, role, company) },
                { label: "Rejection (polite)", msg: buildRejectionMsg(app.full_name, role) },
              ].map(({ label, msg }) => (
                <div key={label} className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(msg)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="size-3.5 shrink-0 text-emerald-600" />
                    {label}
                  </a>
                  <button
                    onClick={() => copyText(msg, `wa-${label}`)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-sand"
                    title="Copy message"
                  >
                    {copied === `wa-${label}` ? <CheckCheck className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Email shortcuts */}
            <div className="mt-3 space-y-2">
              {[
                {
                  label: "Shortlist notification",
                  subject: `You've been shortlisted — ${role} at ${company}`,
                  body: `Hi ${app.full_name},\n\nCongratulations! You've been shortlisted for the ${role} position at ${company}.\n\nOur team will be in touch shortly with the next steps.\n\nBest regards,\nTalent Bridge Egypt Recruitment Team`,
                },
                {
                  label: "Interview scheduling",
                  subject: `Interview invitation — ${role} at ${company}`,
                  body: `Hi ${app.full_name},\n\nWe're pleased to invite you for an interview for the ${role} role at ${company}.\n\nPlease reply with your availability this week.\n\nBest regards,\nTalent Bridge Egypt Recruitment Team`,
                },
              ].map(({ label, subject, body }) => (
                <a
                  key={label}
                  href={`mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <Mail className="size-3.5 shrink-0 text-blue-600" />
                  Email: {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SHARE TO COMPANY HR ── */}
      <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-violet-50/30 shadow-sm p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-1 flex items-center gap-2">
          <Share2 className="size-4 text-violet-600" /> Share Full Profile to Company HR
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Send the complete candidate profile — scores, transcript, all details — directly to the company's HR.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          {hrPhone && (
            <a
              href={`https://wa.me/${waNumber(hrPhone)}?text=${encodeURIComponent(shareMsg)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <MessageCircle className="size-4" />
              Send to Company HR via WhatsApp
            </a>
          )}
          <button
            onClick={() => copyText(shareMsg, "share-profile")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm",
              copied === "share-profile"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
            )}
          >
            {copied === "share-profile" ? <CheckCheck className="size-4" /> : <Copy className="size-4" />}
            {copied === "share-profile" ? "Copied!" : "Copy Full Profile"}
          </button>
          <a
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interview: ${app.full_name} — ${role} @ ${company}`)}&details=${encodeURIComponent(`Candidate: ${app.full_name}\nPhone: ${app.phone}\nEmail: ${app.email}\nRole: ${role}\nCompany: ${company}\nScore: ${liveTotal}/30\n\nScheduled via Talent Bridge Egypt`)}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-sand transition-colors shadow-sm"
          >
            <Calendar className="size-4" /> Add Interview to Calendar
          </a>
        </div>

        {/* Preview of share message */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 select-none">
            <ExternalLink className="size-3" />
            Preview message that will be sent
          </summary>
          <div className="mt-3 rounded-xl border border-violet-200 bg-white p-4">
            <pre className="whitespace-pre-wrap text-xs text-ink font-sans leading-relaxed max-h-64 overflow-y-auto">{shareMsg}</pre>
          </div>
        </details>
      </div>

      {/* ── RECRUITMENT DECISION ── */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" /> Recruitment Decision
        </h2>

        {/* Status buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(["new", "shortlisted", "hired", "rejected"] as const).map((s) => {
            const cfg = STATUS_CFG[s];
            const isActive = app.status === s;
            return (
              <button
                key={s}
                onClick={() => update.mutate({ status: s })}
                disabled={update.isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? cfg.cls + " shadow-soft scale-[1.02]"
                    : "border-border bg-card text-muted-foreground hover:bg-sand hover:text-foreground",
                )}
              >
                <span className={cn("size-2 rounded-full", isActive ? cfg.dot : "bg-muted-foreground/30")} />
                {cfg.label}
                {isActive && <Check className="size-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Admin notes */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Internal Notes <span className="font-normal normal-case">(auto-saved on blur, private)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (app.admin_notes ?? "") && update.mutate({ admin_notes: notes })}
            placeholder="Add private notes about this candidate — interview feedback, salary negotiation, flags…"
            rows={4}
            className="w-full rounded-xl border border-border bg-[#f8f9fb] p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/60"
          />
          {app.updated_at && (
            <div className="mt-1 text-[10px] text-muted-foreground">Last updated: {new Date(app.updated_at).toLocaleString("en-GB")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── VOICE NOTE CARD WITH REAL AUDIO PLAYER ── */
function VoiceNoteCard({
  voiceNote, index, transcript, onCopy, copied, hrPhone, candidateName, role, waNumber,
}: {
  voiceNote: { lang: string; path: string };
  index: number;
  transcript: string | null;
  onCopy: (text: string, key: string) => void;
  copied: string | null;
  hrPhone: string | null;
  candidateName: string;
  role: string;
  waNumber: (phone: string) => string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        toast.info("Audio file not accessible in demo mode. In production, the real file URL will play.");
      });
      setIsPlaying(true);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-[#f8f9fb] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-full bg-primary/10">
            <Mic className="size-3.5 text-primary" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Voice Note {index + 1} — {voiceNote.lang}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">On file ✓</span>
      </div>

      {/* Real Audio Player */}
      <div className="rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-3 mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white hover:opacity-90 transition-opacity shadow-sm"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink truncate mb-1">voice-note-{voiceNote.lang.toLowerCase()}.webm</div>
            <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
              <div className="h-full w-0 rounded-full bg-primary/60 transition-all duration-300" />
            </div>
          </div>
          {voiceNote.path && (
            <a
              href={voiceNote.path}
              download
              className="grid size-7 shrink-0 place-items-center rounded-lg border border-primary/20 bg-white text-primary/60 hover:text-primary transition-colors"
              title="Download voice note"
            >
              <Download className="size-3.5" />
            </a>
          )}
        </div>
        {voiceNote.path && (
          <audio
            ref={audioRef}
            src={voiceNote.path}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      {/* Transcript */}
      {transcript ? (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Transcript ({voiceNote.lang})
          </div>
          <blockquote className="border-l-2 border-primary/30 pl-3 text-sm text-ink leading-relaxed italic">
            "{transcript}"
          </blockquote>
          <button
            onClick={() => onCopy(transcript, `transcript-${voiceNote.lang}`)}
            className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            {copied === `transcript-${voiceNote.lang}` ? <CheckCheck className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            Copy transcript
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Transcript not available</p>
      )}

      {/* Share voice note to HR */}
      {hrPhone && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <a
            href={`https://wa.me/${waNumber(hrPhone)}?text=${encodeURIComponent(`Hi, please find the voice note for candidate *${candidateName}* applying for *${role}*.\n\nLanguage: ${voiceNote.lang}\nVoice note link: ${voiceNote.path || "On file"}\n${transcript ? `\nTranscript: "${transcript}"` : ""}`)}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="size-3.5 text-emerald-600" />
            Send voice note to Company HR via WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

/* ── SCORE CARD WITH EDITING ── */
function ScoreCard({
  label, score, max, editing, onChange,
}: {
  label: string; score: number; max: number; editing: boolean; onChange: (v: number) => void;
}) {
  const g = scoreGrade(score, max);
  const pct = (score / max) * 100;

  return (
    <div className="rounded-2xl border border-border/60 bg-[#f8f9fb] p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className={cn("font-display text-3xl font-bold", g.color)}>
        {score}<span className="text-sm font-normal text-muted-foreground">/{max}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-300", g.bar)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className={cn("text-[10px] font-semibold", g.color)}>{g.label}</span>
        {editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => score > 0 && onChange(score - 1)}
              className="grid size-5 place-items-center rounded border border-border bg-white text-muted-foreground hover:bg-sand hover:text-foreground transition-colors"
            >
              <ChevronDown className="size-3" />
            </button>
            <span className="w-5 text-center text-xs font-bold text-ink">{score}</span>
            <button
              onClick={() => score < max && onChange(score + 1)}
              className="grid size-5 place-items-center rounded border border-border bg-white text-muted-foreground hover:bg-sand hover:text-foreground transition-colors"
            >
              <ChevronUp className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
