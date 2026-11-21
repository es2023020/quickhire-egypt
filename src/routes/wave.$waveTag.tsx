import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWaveRoster,
  clientUpdateCandidateWaveStatus,
  adminUpdatePipelineStage,
  type WaveRosterApplicant,
} from "@/lib/applications.functions";
import { OUTCOME_CODES, getOutcomeDefinition } from "@/lib/outcome-codes";
import { checkCandidateCooldown } from "@/lib/cooldown-engine";
import { getFile } from "@/lib/db";
import { openDocumentSafely, downloadDocumentSafely } from "@/lib/document-utils";
import {
  Users, CheckCircle2, XCircle, Clock, Volume2, Play, Pause,
  Download, Share2, MapPin, ExternalLink, FileText, Search,
  ChevronDown, AlertTriangle, Sparkles, MessageCircle, RefreshCw,
  Building2, Calendar, ShieldCheck, ArrowLeft, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { QuickHireLogo } from "@/components/logo";
import { cn } from "@/lib/utils";

const HR_WAVE_STAGES = [
  { key: "interview_done", label: "Interview Done", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  { key: "offer_pending", label: "Offer Pending", color: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { key: "offer_extended", label: "Offer Extended", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  { key: "accepted", label: "Accepted", color: "bg-green-500/20 text-green-300 border-green-500/40" },
  { key: "rejected", label: "Rejected", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
] as const;

export const Route = createFileRoute("/wave/$waveTag")({
  head: () => ({
    meta: [
      { title: "Client Assessment Wave Portal — QuickHire" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WaveRosterPage,
});

function WaveRosterPage() {
  const { waveTag } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "attended" | "passed" | "pending" | "no_show">("all");
  const [search, setSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const rosterQuery = useQuery({
    queryKey: ["client", "wave", waveTag],
    queryFn: () => getWaveRoster({ data: { waveTag } }),
  });

  const updateCandidateMutation = useMutation({
    mutationFn: ({
      id,
      attendance,
      outcome_code,
      outcome_notes,
    }: {
      id: string;
      attendance?: "pending" | "confirmed" | "attended" | "no_show";
      outcome_code?: string | null;
      outcome_notes?: string | null;
    }) =>
      clientUpdateCandidateWaveStatus({
        data: { id, attendance, outcome_code, outcome_notes },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "wave", waveTag] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast.success("Candidate record updated successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update candidate");
    },
  });

  const data = rosterQuery.data;
  const candidates = data?.candidates || [];

  const filteredCandidates = candidates.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        c.full_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.offer?.title || "").toLowerCase().includes(q) ||
        (c.english_level || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    if (activeTab === "attended") return c.interview_attendance === "attended";
    if (activeTab === "passed") return c.outcome_code?.startsWith("passed") || c.status === "hired";
    if (activeTab === "pending") return !c.outcome_code && c.interview_attendance !== "no_show";
    if (activeTab === "no_show") return c.interview_attendance === "no_show" || c.outcome_code === "no_show";
    return true;
  });

  function handleExportCsv() {
    if (!candidates.length) {
      toast.error("No candidates to export");
      return;
    }

    const headers = [
      "Candidate Name",
      "Phone",
      "Email",
      "Offer Role",
      "Company",
      "Wave Tag",
      "Interview Date",
      "Interview Time",
      "Gate Attendance",
      "CEFR English Level",
      "AI Score /30",
      "Assessment Outcome",
      "Client Feedback Notes",
    ];

    const rows = candidates.map((c) => [
      `"${c.full_name}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      `"${c.offer?.title || ""}"`,
      `"${c.offer?.company || ""}"`,
      `"${c.wave_tag || waveTag}"`,
      `"${c.interview_date || ""}"`,
      `"${c.interview_time || ""}"`,
      `"${c.interview_attendance || "pending"}"`,
      `"${c.english_level || ""}"`,
      `"${c.total_score ?? ""}"`,
      `"${c.outcome_code ? (getOutcomeDefinition(c.outcome_code)?.shortLabel || c.outcome_code) : "Pending Evaluation"}"`,
      `"${(c.outcome_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Wave_Roster_${(waveTag || "Export").replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Wave roster CSV downloaded!");
  }

  function handleShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      toast.success("Live Wave link copied to clipboard!");
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Client Bar */}
      <header className="border-b border-white/10 bg-surface-1 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <QuickHireLogo size={32} className="rounded-xl shadow-[0_0_12px_rgba(182,255,46,0.3)]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-white tracking-tight">Quick<span className="text-primary">Hire</span></span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                  Client HR Live Wave Portal
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Direct Assessment &amp; Gate Pass Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Wave Selector Dropdown */}
            {data && data.allAvailableWaves.length > 0 && (
              <div className="relative">
                <select
                  value={waveTag}
                  onChange={(e) => navigate({ to: `/wave/${encodeURIComponent(e.target.value)}` })}
                  className="appearance-none bg-surface-2 hover:bg-surface-3 border border-white/10 rounded-xl px-4 py-2 pr-8 text-xs font-semibold text-white outline-none transition-colors cursor-pointer"
                >
                  <option value="all" className="bg-surface-1 text-white">All Waves</option>
                  {data.allAvailableWaves.map((w) => (
                    <option key={w} value={w} className="bg-surface-1 text-white">
                      Wave: {w}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={handleShareLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-medium text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <Share2 className="size-3.5 text-primary" />
              {copiedLink ? "Link Copied!" : "Share Link"}
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#c2ff47] transition-all cursor-pointer shadow-sm"
            >
              <Download className="size-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => rosterQuery.refetch()}
              title="Refresh Roster"
              className="rounded-xl border border-white/10 bg-surface-2 p-1.5 text-zinc-400 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${rosterQuery.isFetching ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Wave Hero Banner */}
      <div className="bg-surface-1 border-b border-white/10 py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-1">
                <Building2 className="size-4 text-primary" />
                <span className="text-white font-bold">{data?.companyName || "BPO Partner"}</span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-md text-[11px] text-primary font-bold">
                  {decodeURIComponent(waveTag)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Candidate Assessment Roster
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400 flex flex-wrap items-center gap-y-1 gap-x-3">
                {data?.interviewDate && (
                  <span className="inline-flex items-center gap-1 text-zinc-300">
                    <Calendar className="size-3.5 text-primary" /> Date: {data.interviewDate}
                  </span>
                )}
                {data?.siteName && (
                  <span className="inline-flex items-center gap-1 text-zinc-300">
                    <MapPin className="size-3.5 text-primary" /> {data.siteName}
                  </span>
                )}
                {data?.mapsLink && (
                  <a
                    href={data.mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                  >
                    Open Google Maps Directions <ExternalLink className="size-3" />
                  </a>
                )}
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <div className="bg-surface-2 rounded-xl p-3 border border-white/10 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">{data?.totalCandidates ?? 0}</div>
                <div className="text-[10px] text-zinc-400 font-medium">Booked</div>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{data?.attendedCount ?? 0}</div>
                <div className="text-[10px] text-emerald-300 font-medium">Checked-in</div>
              </div>
              <div className="bg-primary/10 rounded-xl p-3 border border-primary/30 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-primary">{data?.passedCount ?? 0}</div>
                <div className="text-[10px] text-primary/90 font-medium">Selected</div>
              </div>
              <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/30 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{data?.noShowCount ?? 0}</div>
                <div className="text-[10px] text-rose-300 font-medium">No-Shows</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-surface-1 border border-white/10 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "all" ? "bg-primary text-black font-bold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-surface-2"
              }`}
            >
              All Booked ({candidates.length})
            </button>
            <button
              onClick={() => setActiveTab("attended")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "attended" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-zinc-400 hover:text-white hover:bg-surface-2"
              }`}
            >
              Checked-In ({candidates.filter((c) => c.interview_attendance === "attended").length})
            </button>
            <button
              onClick={() => setActiveTab("passed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "passed" ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "text-zinc-400 hover:text-white hover:bg-surface-2"
              }`}
            >
              Offers / Selected ({candidates.filter((c) => c.outcome_code?.startsWith("passed") || c.status === "hired").length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "pending" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400 hover:text-white hover:bg-surface-2"
              }`}
            >
              Pending Decision ({candidates.filter((c) => !c.outcome_code && c.interview_attendance !== "no_show").length})
            </button>
            <button
              onClick={() => setActiveTab("no_show")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "no_show" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "text-zinc-400 hover:text-white hover:bg-surface-2"
              }`}
            >
              No-Shows ({candidates.filter((c) => c.interview_attendance === "no_show" || c.outcome_code === "no_show").length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search candidate name, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface-2 pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Candidate Cards Grid */}
        {rosterQuery.isLoading ? (
          <div className="p-16 rounded-2xl bg-surface-1 border border-white/10 text-center shadow-sm">
            <RefreshCw className="size-7 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading client wave roster...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-16 rounded-2xl bg-surface-1 border border-white/10 text-center shadow-sm">
            <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No candidates match this filter</h3>
            <p className="text-xs text-muted-foreground mt-1">Try switching tabs or resetting the search term.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
              <CandidateWaveCard
                key={candidate.id}
                candidate={candidate}
                allCandidates={candidates}
                onUpdateStatus={(params) => updateCandidateMutation.mutate({ id: candidate.id, ...params })}
                isUpdating={updateCandidateMutation.isPending}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Candidate Wave Card
   ───────────────────────────────────────────────────────────── */
interface CandidateWaveCardProps {
  candidate: WaveRosterApplicant;
  allCandidates: WaveRosterApplicant[];
  onUpdateStatus: (params: {
    attendance?: "pending" | "confirmed" | "attended" | "no_show";
    outcome_code?: string | null;
    outcome_notes?: string | null;
  }) => void;
  isUpdating: boolean;
}

function CandidateWaveCard({
  candidate,
  allCandidates,
  onUpdateStatus,
  isUpdating,
}: CandidateWaveCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [notes, setNotes] = useState(candidate.outcome_notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Check 90-day cooldown risk across all applications
  const cooldownCheck = checkCandidateCooldown(candidate, allCandidates);

  const activeOutcome = candidate.outcome_code ? getOutcomeDefinition(candidate.outcome_code) : null;

  function handleSaveNotes() {
    setIsSavingNotes(true);
    onUpdateStatus({ outcome_notes: notes });
    setTimeout(() => setIsSavingNotes(false), 500);
  }

  const cvTarget = (candidate.cv_path?.startsWith("http") ? candidate.cv_path : candidate.cv_data) || "/placeholder-cv.pdf";

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm hover:border-white/20 transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        {/* Candidate Primary Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {candidate.full_name}
            </h3>

            {/* CEFR Badge */}
            {candidate.english_level && (
              <span className="rounded-full bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 text-xs font-bold">
                {candidate.english_level.split("–")[0].trim()}
              </span>
            )}

            {/* AI Score Badge */}
            {candidate.total_score != null && (
              <span className="rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold">
                Score: {candidate.total_score}/30
              </span>
            )}

            {/* Cooldown Guardrail Badge */}
            {cooldownCheck.hasCooldownRisk ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold">
                <AlertTriangle className="size-3" /> 90-Day Cooldown Risk
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold">
                <ShieldCheck className="size-3" /> Cooldown Clear
              </span>
            )}

            {/* Active Outcome Code Badge */}
            {activeOutcome && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${activeOutcome.badgeStyle}`}>
                {activeOutcome.shortLabel}
              </span>
            )}

            {/* Current Pipeline Stage Pill */}
            <span className="rounded-full bg-surface-2 text-zinc-300 border border-white/10 px-2.5 py-0.5 text-xs font-medium">
              Stage: {HR_WAVE_STAGES.find((s) => s.key === candidate.pipeline_stage)?.label || candidate.pipeline_stage || "Wave Scheduled"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
            <span>📞 <strong className="text-white font-mono">{candidate.phone}</strong></span>
            {candidate.location && <span>📍 {candidate.location}</span>}
            {candidate.age && <span>🎂 Age {candidate.age}</span>}
            {candidate.grad_status && <span>🎓 {candidate.grad_status}</span>}
            {candidate.offer?.title && <span className="font-medium text-primary">💼 {candidate.offer.title}</span>}
          </div>

          {/* Voice Note Audio Players */}
          {candidate.voice_notes && candidate.voice_notes.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-surface-2 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Volume2 className="size-3.5 text-primary" /> Assessment Voice Recordings ({candidate.voice_notes.length})
                </span>
                {candidate.transcripts && Object.keys(candidate.transcripts).length > 0 && (
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    {showTranscript ? "Hide Transcripts" : "Read Transcripts"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidate.voice_notes.map((vn, i) => (
                  <WaveAudioPlayer
                    key={vn.path || i}
                    candidateId={candidate.id}
                    lang={vn.lang}
                    path={vn.path}
                    dataUrl={vn.data}
                  />
                ))}
              </div>

              {/* Collapsible Transcript Preview */}
              {showTranscript && candidate.transcripts && (
                <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                  {Object.entries(candidate.transcripts).map(([lang, text]) => (
                    <div key={lang} className="bg-surface-3 p-2 rounded-lg border border-white/10 text-white">
                      <span className="font-semibold text-primary block mb-0.5">{lang} Transcript:</span>
                      <p className="text-zinc-300 italic">"{text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CV & External Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {candidate.cv_path || candidate.cv_data ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openDocumentSafely(cvTarget, `${candidate.full_name.replace(/\s+/g, "_")}_CV.pdf`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-1 text-xs font-semibold text-white hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  <FileText className="size-3.5 text-primary" />
                  View CV <ArrowUpRight className="size-3 text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocumentSafely(cvTarget, `${candidate.full_name.replace(/\s+/g, "_")}_CV.pdf`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-surface-2 px-2 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
                  title="Download candidate CV"
                >
                  <Download className="size-3" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/60 italic">No CV document uploaded</span>
            )}

            <a
              href={`https://wa.me/${candidate.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="size-3.5" /> WhatsApp Candidate
            </a>
          </div>
        </div>

        {/* Client HR Action Controls Column */}
        <div className="lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5 space-y-3">
          {/* Gate Attendance Toggle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              1. Reception Gate Check-In
            </label>
            <div className="grid grid-cols-3 gap-1 bg-surface-2 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => onUpdateStatus({ attendance: "pending" })}
                className={`py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  !candidate.interview_attendance || candidate.interview_attendance === "pending"
                    ? "bg-surface-3 text-white shadow-sm border border-white/10"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus({ attendance: "attended" })}
                className={`py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  candidate.interview_attendance === "attended"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-muted-foreground hover:text-emerald-300"
                }`}
              >
                Attended ✅
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus({ attendance: "no_show", outcome_code: "no_show" })}
                className={`py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  candidate.interview_attendance === "no_show" || candidate.outcome_code === "no_show"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-muted-foreground hover:text-rose-300"
                }`}
              >
                No-Show ❌
              </button>
            </div>
          </div>

          {/* Assessment Outcome Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              2. Assessment Outcome Scorecard
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {OUTCOME_CODES.map((code) => {
                const isSelected = candidate.outcome_code === code.code;
                return (
                  <button
                    key={code.code}
                    type="button"
                    onClick={() => onUpdateStatus({ outcome_code: code.code })}
                    className={`px-2 py-1.5 rounded-lg text-left text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? `${code.badgeStyle} ring-2 ring-primary shadow-sm font-bold`
                        : "border-white/10 bg-surface-2 text-zinc-300 hover:bg-surface-3 hover:text-white"
                    }`}
                  >
                    {code.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client Interview Feedback Note */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              3. Interviewer Feedback / Observation
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="e.g. C1 accent, strong sales pitch, offered 16k gross"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNotes();
                }}
                className="flex-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-primary bg-surface-2"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || notes === (candidate.outcome_notes || "")}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-black hover:bg-[#c2ff47] disabled:opacity-40 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          {/* Quick Stage Selection for Client HR */}
          <div className="pt-2 border-t border-white/10">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              4. Move Pipeline Stage
            </label>
            <div className="flex flex-wrap gap-1">
              {HR_WAVE_STAGES.map((s) => {
                const isCurrent = candidate.pipeline_stage === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      adminUpdatePipelineStage({
                        data: {
                          id: candidate.id,
                          stage: s.key,
                          changed_by: "Client HR (Live Wave)",
                          role: "client_hr",
                          comment: `Status set from Live Wave Portal`,
                        },
                      }).then(() => {
                        toast.success(`Candidate moved to ${s.label}`);
                      });
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                      isCurrent
                        ? `${s.color} font-bold ring-1 ring-white/20`
                        : "bg-surface-2 border-white/10 text-muted-foreground hover:bg-surface-3 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   In-Browser Voice Note Audio Player with Speed Control
   ───────────────────────────────────────────────────────────── */
function WaveAudioPlayer({
  candidateId,
  lang,
  path,
  dataUrl,
}: {
  candidateId: string;
  lang: string;
  path?: string;
  dataUrl?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [src, setSrc] = useState<string | null>(null);
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
        toast.info("Sample audio playback placeholder.");
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
    <div className="flex items-center gap-2 rounded-lg bg-surface-3 border border-white/10 px-2.5 py-1.5 shadow-sm">
      <audio
        ref={audioRef}
        src={src || undefined}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`size-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          isPlaying ? "bg-primary text-black" : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
        title={isPlaying ? "Pause" : "Play Voice Note"}
      >
        {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            {lang.toUpperCase()} Audio
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            className="text-[10px] font-mono text-zinc-400 hover:text-white px-1 py-0.5 rounded bg-surface-2 border border-white/5 cursor-pointer"
            title="Cycle playback speed"
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
