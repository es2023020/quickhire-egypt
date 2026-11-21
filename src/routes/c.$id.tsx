import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClientCandidateProfile,
  clientUpdateCandidateWaveStatus,
  adminUpdatePipelineStage,
} from "@/lib/applications.functions";
import { OUTCOME_CODES, getOutcomeDefinition } from "@/lib/outcome-codes";
import { checkCandidateCooldown } from "@/lib/cooldown-engine";
import { generateCandidateAccessCode } from "@/lib/candidate-access";
import { getFile } from "@/lib/db";
import {
  Users, CheckCircle2, XCircle, Clock, Volume2, Play, Pause,
  Download, Share2, MapPin, ExternalLink, FileText, Search,
  ChevronDown, AlertTriangle, Sparkles, MessageCircle, RefreshCw,
  Building2, Calendar, ShieldCheck, ArrowLeft, ArrowUpRight, Lock, KeyRound,
  GraduationCap, Briefcase, Mail, Phone, Award, ThumbsUp, ThumbsDown, Check
} from "lucide-react";
import { toast } from "sonner";
import { QuickHireLogo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { openDocumentSafely, downloadDocumentSafely } from "@/lib/document-utils";

const HR_PIPELINE_STAGES = [
  { key: "interview_done", label: "Interview Done / Under Evaluation", color: "bg-indigo-950/60 text-indigo-300 border-indigo-500/40" },
  { key: "offer_pending", label: "Offer Pending / Approval", color: "bg-amber-950/60 text-amber-300 border-amber-500/40" },
  { key: "offer_extended", label: "Offer Extended", color: "bg-primary/20 text-primary border-primary/50" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40" },
  { key: "rejected", label: "Rejected / Archived", color: "bg-rose-950/60 text-rose-300 border-rose-500/40" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-zinc-800/80 text-zinc-400 border-zinc-700" },
] as const;

export const Route = createFileRoute("/c/$id")({
  component: ClientCandidateProfilePage,
});

function ClientCandidateProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [enteredCode, setEnteredCode] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("code") || "";
    }
    return "";
  });
  const [activeCode, setActiveCode] = useState(enteredCode);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("2026-11-05");
  const [interviewTime, setInterviewTime] = useState("11:30 AM");
  const [interviewSite, setInterviewSite] = useState("");
  const [selectedHrStage, setSelectedHrStage] = useState<string | null>(null);
  const [hrStageComment, setHrStageComment] = useState("");

  const updatePipelineStageMutation = useMutation({
    mutationFn: ({ stage, comment }: { stage: string; comment?: string | null }) =>
      adminUpdatePipelineStage({
        data: {
          id,
          stage,
          changed_by: "Client HR Partner",
          role: "client_hr",
          comment: comment || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "candidate", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      setSelectedHrStage(null);
      setHrStageComment("");
      toast.success("Stage updated in QuickHire database!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update stage");
    },
  });

  const profileQuery = useQuery({
    queryKey: ["client", "candidate", id, activeCode],
    queryFn: () => getClientCandidateProfile({ data: { id, code: activeCode } }),
  });

  const updateCandidateMutation = useMutation({
    mutationFn: ({
      attendance,
      outcome_code,
      outcome_notes,
      status,
    }: {
      attendance?: "pending" | "confirmed" | "attended" | "no_show";
      outcome_code?: string | null;
      outcome_notes?: string | null;
      status?: string;
    }) =>
      clientUpdateCandidateWaveStatus({
        data: { id, attendance, outcome_code, outcome_notes, status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "candidate", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      toast.success("Candidate record updated in live database!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update candidate");
    },
  });

  const data = profileQuery.data;
  const candidate = data?.candidate;
  const isValidCode = data?.isValidCode ?? false;
  const expectedCode = data?.requiredCode || generateCandidateAccessCode(id);

  useEffect(() => {
    if (candidate?.outcome_notes) {
      setNotes(candidate.outcome_notes);
    }
    if (candidate?.interview_site) {
      setInterviewSite(candidate.interview_site);
    }
  }, [candidate]);

  function handleUnlockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enteredCode.trim()) {
      toast.error("Please enter the candidate access code");
      return;
    }
    setActiveCode(enteredCode.trim());
    navigate({
      to: "/c/$id",
      params: { id },
      search: () => ({ code: enteredCode.trim() }),
      replace: true,
    });
  }

  function handleSaveNotes() {
    setIsSavingNotes(true);
    updateCandidateMutation.mutate(
      { outcome_notes: notes },
      {
        onSettled: () => setIsSavingNotes(false),
      }
    );
  }

  function copyCandidateShareWhatsApp() {
    const code = expectedCode;
    const url = `${window.location.origin}/c/${id}?code=${code}`;
    const role = candidate?.offer?.title || "Customer Operations & Sales";
    const company = candidate?.offer?.company || "BPO Partner";
    const english = candidate?.english_level || "C1 Advanced";
    const score = candidate?.total_score != null ? `${candidate.total_score}/30` : "Top Rated";

    const msg =
      `🌟 *QuickHire Candidate Profile: ${candidate?.full_name || "Applicant"}*\n` +
      `💼 *Role:* ${role} (${company})\n` +
      `🗣️ *English Level:* ${english} | *AI Score:* ${score}\n` +
      `🛡️ *Access Code:* ${code}\n\n` +
      `Review full profile, listen to voice note recordings, and extend an offer directly here:\n` +
      `👉 ${url}\n\n` +
      `*QuickHire Egypt Operations*`;

    navigator.clipboard.writeText(msg).then(() => {
      toast.success("WhatsApp profile link & access code copied!");
    });
  }

  // 1. Loading State
  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <div className="text-center">
          <RefreshCw className="size-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-semibold text-white">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  // 2. Candidate Not Found
  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-surface-1 p-8 text-center shadow-xl">
          <Users className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <h2 className="text-xl font-bold font-display text-white">Candidate Not Found</h2>
          <p className="text-xs text-muted-foreground mt-2">
            The profile link may have expired or this applicant ID does not exist in our live database.
          </p>
          <div className="mt-6">
            <Link
              to="/offers"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.25)]"
            >
              Browse Open Positions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Security Code Gate (if code missing or invalid)
  if (!isValidCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-surface-1 p-8 shadow-2xl">
          <div className="flex items-center justify-center size-12 rounded-2xl border border-primary/30 bg-primary/10 text-primary mx-auto mb-4">
            <Lock className="size-6" />
          </div>
          <h2 className="text-xl font-bold font-display text-white text-center">
            Partner Access Verification
          </h2>
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            This dossier contains confidential candidate assessment data, voice recordings, and CV for{" "}
            <b className="text-white">{candidate.full_name}</b>. Please enter the access code provided via WhatsApp.
          </p>

          <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Candidate Access Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${expectedCode}`}
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-white/10 bg-surface-2 pl-10 pr-4 py-3 text-sm font-mono font-bold uppercase tracking-widest text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 focus:bg-surface-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-[#c2ff47] transition-all shadow-[0_0_15px_rgba(182,255,46,0.35)] cursor-pointer"
            >
              Unlock Dossier &amp; Voice Notes 🚀
            </button>

            <div className="p-3 rounded-xl bg-surface-2 border border-white/10 text-center">
              <span className="text-[11px] text-zinc-400">
                Authorized hiring managers only. QuickHire Egypt Enterprise Security.
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 4. Authenticated Client Dossier View
  const cooldownCheck = checkCandidateCooldown(candidate, data?.allApplicationsForCooldown || []);
  const activeOutcome = candidate.outcome_code ? getOutcomeDefinition(candidate.outcome_code) : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Client Bar */}
      <header className="border-b border-white/[0.08] bg-surface-1/90 backdrop-blur-md sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <QuickHireLogo size={32} className="rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-white">Quick<span className="text-primary">Hire</span></span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                  Client HR Dossier
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Verified Candidate Profile &amp; Direct Hiring Scorecard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCandidateShareWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2 text-xs font-semibold text-white hover:bg-surface-3 transition-colors shadow-xs cursor-pointer"
            >
              <Share2 className="size-3.5 text-primary" /> Share WhatsApp Link
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-black shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:bg-[#c2ff47] transition-all cursor-pointer"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Banner with Candidate Name & Scores */}
        <div className="rounded-3xl bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 text-white p-6 sm:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-2">
                <Building2 className="size-4" />
                <span>{candidate.offer?.company || "BPO Partner"}</span>
                <span className="text-zinc-600">•</span>
                <span className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded text-[11px] text-primary font-mono font-bold">
                  Code: {expectedCode}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight text-white">
                {candidate.full_name}
              </h1>

              <p className="mt-1.5 text-sm sm:text-base text-zinc-300 font-medium">
                {candidate.offer?.title || "Customer Care Representative"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
                <span>📞 <strong className="text-white font-mono">{candidate.phone}</strong></span>
                <span>✉️ {candidate.email}</span>
                {candidate.location && <span>📍 {candidate.location}</span>}
                {candidate.age && <span>🎂 Age {candidate.age}</span>}
                {candidate.grad_status && <span>🎓 {candidate.grad_status}</span>}
              </div>
            </div>

            {/* AI CEFR Score Card Badge */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-surface-2/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-28 shadow-lg">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                  {candidate.total_score != null ? `${candidate.total_score}/30` : "Done"}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mt-0.5">
                  AI Fit Score
                </div>
              </div>

              <div className="bg-surface-2/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-28 shadow-lg">
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
                  {candidate.english_level ? candidate.english_level.split("–")[0].trim() : "B2+"}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mt-0.5">
                  CEFR Level
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Dossier Details, Audio, CV (2 spans) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 90-Day Cooldown & Screening Guardrails */}
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" /> Compliance & 90-Day Cooldown Clearance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${
                  cooldownCheck.hasCooldownRisk
                    ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                    : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {cooldownCheck.hasCooldownRisk ? (
                      <AlertTriangle className="size-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    )}
                    <span>{cooldownCheck.hasCooldownRisk ? "Cooldown Risk Flagged" : "90-Day Cooldown: Cleared"}</span>
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed text-zinc-300">
                    {cooldownCheck.reason || "No prior interview history detected at this client account within 90 days. Safe to schedule on-site."}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-surface-2/60">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Briefcase className="size-3.5 text-primary" /> Notice Period & Availability
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {candidate.answers?.has_contract_or_resigned || "Currently free to join immediately"}.
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Notes Audio Player Card */}
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Volume2 className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Assessment Voice Recordings</h3>
                    <p className="text-xs text-zinc-400">
                      Spoken English &amp; fluency recordings scored by QuickHire
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  {(candidate.voice_notes ?? []).length} Recording(s)
                </span>
              </div>

              {(candidate.voice_notes ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-400">
                  No voice notes submitted with this application.
                </div>
              ) : (
                <div className="space-y-3">
                  {(candidate.voice_notes ?? []).map((vn, i) => (
                    <DossierAudioPlayer
                      key={vn.path || i}
                      candidateId={candidate.id}
                      lang={vn.lang}
                      path={vn.path}
                      dataUrl={vn.data}
                      transcript={candidate.transcripts?.[vn.lang] || null}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* AI Evaluator Notes & Criteria */}
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" /> AI Evaluator Assessment Breakdown
              </h3>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-3 rounded-xl bg-surface-2 border border-white/10 text-center">
                  <div className="text-lg font-bold font-mono text-white">{candidate.english_score ?? 8}/10</div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold">English Fluency</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-white/10 text-center">
                  <div className="text-lg font-bold font-mono text-white">{candidate.comm_score ?? 8}/10</div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold">Communication</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-white/10 text-center">
                  <div className="text-lg font-bold font-mono text-white">{candidate.exp_score ?? 7}/10</div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold">Relevance</div>
                </div>
              </div>

              {candidate.ai_notes && (
                <div className="p-3.5 rounded-xl bg-surface-2 border border-primary/20 text-xs text-zinc-300 leading-relaxed italic">
                  "{candidate.ai_notes}"
                </div>
              )}
            </div>

            {/* Candidate Resume / CV Section */}
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FileText className="size-4 text-primary" /> Candidate Resume / CV Document
                </h3>
                {candidate.cv_data || candidate.cv_path ? (
                  <button
                    type="button"
                    onClick={() => {
                      const docTarget = (candidate.cv_path?.startsWith("http") ? candidate.cv_path : candidate.cv_data) || "/placeholder-cv.pdf";
                      openDocumentSafely(docTarget, `${candidate.full_name.replace(/\s+/g, "_")}_CV.pdf`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Open Full PDF <ArrowUpRight className="size-3" />
                  </button>
                ) : null}
              </div>

              {candidate.cv_data || candidate.cv_path ? (
                <div className="border border-white/10 rounded-xl p-4 bg-surface-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-surface-1 border border-white/10 flex items-center justify-center text-primary shadow-2xs">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">{candidate.full_name} — CV.pdf</div>
                      <div className="text-[10px] text-zinc-400">Verified Document on File</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const docTarget = (candidate.cv_path?.startsWith("http") ? candidate.cv_path : candidate.cv_data) || "/placeholder-cv.pdf";
                      downloadDocumentSafely(docTarget, `${candidate.full_name.replace(/\s+/g, "_")}_CV.pdf`);
                    }}
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-black hover:bg-[#c2ff47] transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="size-3.5" /> Download CV
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-400">
                  No CV file uploaded. Candidate applied with voice screening and profile questions.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Direct Partner Action Panel (Real-Time Database Sync) */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-2xl sticky top-20">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Client Decision Panel
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Action directly updates QuickHire operations
                  </p>
                </div>
                {activeOutcome && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeOutcome.badgeStyle}`}>
                    {activeOutcome.shortLabel}
                  </span>
                )}
              </div>

              {/* Action 1: Extend Offer / Accept */}
              <div className="space-y-2 mb-5">
                <button
                  type="button"
                  disabled={updateCandidateMutation.isPending}
                  onClick={() =>
                    updateCandidateMutation.mutate({
                      outcome_code: "passed_offer",
                      status: "hired",
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 px-4 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-60 cursor-pointer"
                >
                  <ThumbsUp className="size-4" /> Extend Offer / Direct Hire 🎉
                </button>

                <button
                  type="button"
                  disabled={updateCandidateMutation.isPending}
                  onClick={() =>
                    updateCandidateMutation.mutate({
                      outcome_code: "passed_backup",
                      status: "shortlisted",
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-zinc-200 border border-white/10 hover:border-white/20 font-semibold text-xs py-2 px-3 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Check className="size-3.5 text-primary" /> Accept as Wave Backup / Bench ⏳
                </button>
              </div>

              {/* Action 2: Granular Outcome Codes */}
              <div className="mb-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Evaluation Outcome Codes
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {OUTCOME_CODES.map((code) => {
                    const isSelected = candidate.outcome_code === code.code;
                    return (
                      <button
                        key={code.code}
                        type="button"
                        disabled={updateCandidateMutation.isPending}
                        onClick={() => updateCandidateMutation.mutate({ outcome_code: code.code })}
                        className={`px-2 py-1.5 rounded-lg text-left text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? `${code.badgeStyle} ring-2 ring-primary border-primary font-bold shadow-md`
                            : "border-white/10 bg-surface-2 text-zinc-300 hover:bg-surface-3 hover:text-white"
                        }`}
                      >
                        {code.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action 3: Client Feedback Notes */}
              <div className="mb-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Client Interviewer Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Cleared technical interview, C1 British accent, offered 18k package."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 p-2.5 text-xs text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 bg-surface-2 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === (candidate.outcome_notes || "")}
                  className="mt-2 w-full rounded-xl bg-primary text-black font-bold text-xs py-2 hover:bg-[#c2ff47] transition-all shadow-[0_0_12px_rgba(182,255,46,0.2)] disabled:opacity-40 cursor-pointer"
                >
                  {isSavingNotes ? "Saving to Database..." : "Save Feedback Note"}
                </button>
              </div>

              {/* Action 4: Set Pipeline Stage */}
              <div className="mb-5 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Recruitment Stage
                  </label>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                    HR_PIPELINE_STAGES.find((s) => s.key === candidate.pipeline_stage)?.color || "bg-surface-2 text-zinc-300 border-white/10"
                  )}>
                    {HR_PIPELINE_STAGES.find((s) => s.key === candidate.pipeline_stage)?.label || candidate.pipeline_stage || "Applied"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  {HR_PIPELINE_STAGES.map((s) => {
                    const isCurrent = candidate.pipeline_stage === s.key;
                    const isSelected = selectedHrStage === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          if (isCurrent) return;
                          setSelectedHrStage(isSelected ? null : s.key);
                        }}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-left text-xs font-semibold border transition-all truncate cursor-pointer",
                          isCurrent
                            ? `${s.color} ring-2 ring-primary font-bold shadow-xs`
                            : isSelected
                            ? "bg-primary text-black border-primary font-bold shadow-xs"
                            : "border-white/10 bg-surface-2 text-zinc-300 hover:bg-surface-3 hover:text-white"
                        )}
                        title={s.label}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {selectedHrStage && (
                  <div className="rounded-xl border border-primary/30 bg-surface-2 p-2.5 space-y-2 mb-2">
                    <div className="text-[11px] font-semibold text-white">
                      Move stage to: <span className="text-primary font-bold">{HR_PIPELINE_STAGES.find(s => s.key === selectedHrStage)?.label}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Comment / note (optional)"
                      value={hrStageComment}
                      onChange={(e) => setHrStageComment(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-surface-1 px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => { setSelectedHrStage(null); setHrStageComment(""); }}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePipelineStageMutation.mutate({ stage: selectedHrStage, comment: hrStageComment })}
                        disabled={updatePipelineStageMutation.isPending}
                        className="px-3 py-1 bg-primary text-black rounded-lg text-xs font-bold hover:bg-[#c2ff47] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {updatePipelineStageMutation.isPending ? "Updating..." : "Update Stage"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Recent Pipeline History in Dossier */}
                {candidate.pipeline_history && candidate.pipeline_history.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Recent Activity
                    </div>
                    {[...candidate.pipeline_history].reverse().slice(0, 3).map((entry, idx) => (
                      <div key={idx} className="text-[11px] flex flex-wrap items-center gap-1.5 bg-surface-2/60 border border-white/5 rounded-lg p-2">
                        <span className="font-bold text-white">
                          {HR_PIPELINE_STAGES.find(s => s.key === entry.stage)?.label || entry.stage}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          ({entry.role === "client_hr" ? "HR" : "Admin"})
                        </span>
                        {entry.comment && <span className="text-zinc-400 italic truncate">"{entry.comment}"</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct WhatsApp Contact */}
              <div className="pt-3 border-t border-white/10">
                <a
                  href={`https://wa.me/${candidate.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hi ${candidate.full_name}, this is HR from ${candidate.offer?.company || "QuickHire partner"}. We have reviewed your assessment and would like to proceed!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 font-bold text-xs py-2 px-3 transition-colors cursor-pointer"
                >
                  <MessageCircle className="size-4" /> Message Candidate on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   In-Browser Dossier Voice Note Player
   ───────────────────────────────────────────────────────────── */
function DossierAudioPlayer({
  candidateId,
  lang,
  path,
  dataUrl,
  transcript,
}: {
  candidateId: string;
  lang: string;
  path?: string;
  dataUrl?: string;
  transcript: string | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [src, setSrc] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function resolveSource() {
      // 1. Supabase Storage CDN URL
      if (path && path.startsWith("http")) {
        setSrc(path);
        return;
      }

      // 2. Base64 database data
      if (dataUrl) {
        setSrc(dataUrl);
        return;
      }
      try {
        const file = await getFile(`${candidateId}-voice-${lang}`);
        if (file && active) {
          objectUrl = URL.createObjectURL(file);
          setSrc(objectUrl);
        } else if (active) {
          setSrc("/placeholder-audio.mp3");
        }
      } catch {
        if (active) setSrc("/placeholder-audio.mp3");
      }
    }

    resolveSource();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateId, lang, path, dataUrl]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(() => {
        toast.info("Playing demo audio sample");
      });
      setIsPlaying(true);
    }
  }

  function cycleSpeed() {
    const nextSpeed = speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface-2 p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <audio
            ref={audioRef}
            src={src || undefined}
            onEnded={() => setIsPlaying(false)}
            preload="none"
          />
          <button
            type="button"
            onClick={togglePlay}
            className={`size-8 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
              isPlaying ? "bg-primary text-black" : "bg-primary text-black hover:bg-[#c2ff47]"
            }`}
          >
            {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
          </button>
          <div>
            <div className="text-xs font-bold text-white">{lang} Voice Screening</div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {isPlaying ? "Playing..." : "Click play to listen"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-surface-3 border border-white/10 text-zinc-300 hover:bg-surface-1 hover:text-white transition-colors cursor-pointer"
        >
          {speed}x
        </button>
      </div>

      {transcript && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-[10px] font-semibold text-primary hover:underline uppercase tracking-wider block mb-1 cursor-pointer"
          >
            {showTranscript ? "▼ Spoken Transcript" : "▶ Show Spoken Transcript"}
          </button>
          {showTranscript && (
            <p className="text-xs text-zinc-300 bg-surface-1 p-2.5 rounded-lg border border-white/10 leading-relaxed italic">
              "{transcript}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
