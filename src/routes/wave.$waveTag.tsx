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
  { key: "interview_done", label: "Interview Done", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { key: "offer_pending", label: "Offer Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { key: "offer_extended", label: "Offer Extended", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "accepted", label: "Accepted", color: "bg-green-100 text-green-800 border-green-300" },
  { key: "rejected", label: "Rejected", color: "bg-red-100 text-red-600 border-red-200" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-slate-100 text-slate-600 border-slate-200" },
] as const;

export const Route = createFileRoute("/wave/$waveTag")({
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
      <header className="border-b border-white/[0.08] bg-surface-1 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <QuickHireLogo size={32} className="rounded-xl" />
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-sand transition-colors shadow-xs"
            >
              <Share2 className="size-3.5 text-primary" />
              {copiedLink ? "Link Copied!" : "Share Live Link"}
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Download className="size-3.5" />
              Export Client CSV
            </button>

            <button
              onClick={() => rosterQuery.refetch()}
              title="Refresh Roster"
              className="rounded-xl border border-border p-1.5 text-muted-foreground hover:bg-sand hover:text-ink transition-colors"
            >
              <RefreshCw className={`size-3.5 ${rosterQuery.isFetching ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Wave Hero Banner */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold mb-1">
                <Building2 className="size-4" />
                <span>{data?.companyName || "BPO Partner"}</span>
                <span>•</span>
                <span className="font-mono bg-violet-800/60 px-2 py-0.5 rounded text-[11px] text-violet-200">
                  {decodeURIComponent(waveTag)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Candidate Assessment Roster
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-violet-200/80 flex flex-wrap items-center gap-y-1 gap-x-3">
                {data?.interviewDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5 text-violet-300" /> Date: {data.interviewDate}
                  </span>
                )}
                {data?.siteName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-violet-300" /> {data.siteName}
                  </span>
                )}
                {data?.mapsLink && (
                  <a
                    href={data.mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-white underline underline-offset-2 hover:text-violet-200 text-xs"
                  >
                    Open Google Maps Directions <ExternalLink className="size-3" />
                  </a>
                )}
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono">{data?.totalCandidates ?? 0}</div>
                <div className="text-[10px] text-violet-200 font-medium">Booked</div>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-xs rounded-xl p-3 border border-emerald-400/20 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">{data?.attendedCount ?? 0}</div>
                <div className="text-[10px] text-emerald-200 font-medium">Checked-in</div>
              </div>
              <div className="bg-blue-500/20 backdrop-blur-xs rounded-xl p-3 border border-blue-400/20 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-blue-300">{data?.passedCount ?? 0}</div>
                <div className="text-[10px] text-blue-200 font-medium">Selected</div>
              </div>
              <div className="bg-red-500/20 backdrop-blur-xs rounded-xl p-3 border border-red-400/20 text-center min-w-20">
                <div className="text-xl sm:text-2xl font-bold font-mono text-rose-300">{data?.noShowCount ?? 0}</div>
                <div className="text-[10px] text-rose-200 font-medium">No-Shows</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-border rounded-xl shadow-xs w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-ink hover:bg-sand"
              }`}
            >
              All Booked ({candidates.length})
            </button>
            <button
              onClick={() => setActiveTab("attended")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "attended" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-ink hover:bg-sand"
              }`}
            >
              Checked-In ({candidates.filter((c) => c.interview_attendance === "attended").length})
            </button>
            <button
              onClick={() => setActiveTab("passed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "passed" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-ink hover:bg-sand"
              }`}
            >
              Offers / Selected ({candidates.filter((c) => c.outcome_code?.startsWith("passed") || c.status === "hired").length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "pending" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-ink hover:bg-sand"
              }`}
            >
              Pending Decision ({candidates.filter((c) => !c.outcome_code && c.interview_attendance !== "no_show").length})
            </button>
            <button
              onClick={() => setActiveTab("no_show")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "no_show" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:text-ink hover:bg-sand"
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
              className="w-full rounded-xl border border-border bg-white pl-9 pr-3 py-2 text-xs text-ink outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>

        {/* Candidate Cards Grid */}
        {rosterQuery.isLoading ? (
          <div className="p-16 rounded-2xl bg-white border border-border text-center shadow-xs">
            <RefreshCw className="size-7 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading client wave roster...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-16 rounded-2xl bg-white border border-border text-center shadow-xs">
            <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink">No candidates match this filter</h3>
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

  return (
    <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-xs hover:shadow-soft transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        {/* Candidate Primary Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight">
              {candidate.full_name}
            </h3>

            {/* CEFR Badge */}
            {candidate.english_level && (
              <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-xs font-bold">
                {candidate.english_level.split("–")[0].trim()}
              </span>
            )}

            {/* AI Score Badge */}
            {candidate.total_score != null && (
              <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-semibold">
                Score: {candidate.total_score}/30
              </span>
            )}

            {/* Cooldown Guardrail Badge */}
            {cooldownCheck.hasCooldownRisk ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold">
                <AlertTriangle className="size-3" /> 90-Day Cooldown Risk
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold">
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
            <span className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-xs font-bold">
              Stage: {HR_WAVE_STAGES.find((s) => s.key === candidate.pipeline_stage)?.label || candidate.pipeline_stage || "Wave Scheduled"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
            <span>📞 <strong className="text-ink font-mono">{candidate.phone}</strong></span>
            {candidate.location && <span>📍 {candidate.location}</span>}
            {candidate.age && <span>🎂 Age {candidate.age}</span>}
            {candidate.grad_status && <span>🎓 {candidate.grad_status}</span>}
            {candidate.offer?.title && <span className="font-medium text-primary">💼 {candidate.offer.title}</span>}
          </div>

          {/* Voice Note Audio Players */}
          {candidate.voice_notes && candidate.voice_notes.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Volume2 className="size-3.5 text-violet-600" /> Assessment Voice Recordings ({candidate.voice_notes.length})
                </span>
                {candidate.transcripts && Object.keys(candidate.transcripts).length > 0 && (
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-[11px] font-medium text-violet-600 hover:text-violet-800 underline underline-offset-2"
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
                    dataUrl={vn.data}
                  />
                ))}
              </div>

              {/* Collapsible Transcript Preview */}
              {showTranscript && candidate.transcripts && (
                <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                  {Object.entries(candidate.transcripts).map(([lang, text]) => (
                    <div key={lang} className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700 block mb-0.5">{lang} Transcript:</span>
                      <p className="text-slate-600 italic">"{text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CV & External Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {candidate.cv_path || candidate.cv_data ? (
              <a
                href={candidate.cv_data || candidate.cv_path || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-sand transition-colors shadow-2xs"
              >
                <FileText className="size-3.5 text-violet-600" />
                View Candidate CV <ArrowUpRight className="size-3 text-muted-foreground" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground/60 italic">No CV document uploaded</span>
            )}

            <a
              href={`https://wa.me/${candidate.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/10 text-[#128C7E] px-2.5 py-1 text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageCircle className="size-3.5" /> WhatsApp Candidate
            </a>
          </div>
        </div>

        {/* Client HR Action Controls Column */}
        <div className="lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-border/80 pt-4 lg:pt-0 lg:pl-5 space-y-3">
          {/* Gate Attendance Toggle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              1. Reception Gate Check-In
            </label>
            <div className="grid grid-cols-3 gap-1 bg-sand/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => onUpdateStatus({ attendance: "pending" })}
                className={`py-1 text-xs font-semibold rounded-lg transition-colors ${
                  !candidate.interview_attendance || candidate.interview_attendance === "pending"
                    ? "bg-white text-ink shadow-2xs"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus({ attendance: "attended" })}
                className={`py-1 text-xs font-semibold rounded-lg transition-colors ${
                  candidate.interview_attendance === "attended"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-emerald-700"
                }`}
              >
                Attended ✅
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus({ attendance: "no_show", outcome_code: "no_show" })}
                className={`py-1 text-xs font-semibold rounded-lg transition-colors ${
                  candidate.interview_attendance === "no_show" || candidate.outcome_code === "no_show"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-rose-700"
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
                    className={`px-2 py-1.5 rounded-lg text-left text-xs font-semibold border transition-all ${
                      isSelected
                        ? `${code.badgeStyle} ring-2 ring-violet-500 shadow-2xs font-bold`
                        : "border-border/80 bg-white text-muted-foreground hover:bg-sand hover:text-ink"
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
                className="flex-1 rounded-lg border border-border px-2.5 py-1 text-xs text-ink outline-none focus:ring-1 focus:ring-primary bg-white"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || notes === (candidate.outcome_notes || "")}
                className="rounded-lg bg-sand border border-border px-2.5 py-1 text-xs font-semibold text-ink hover:bg-border/60 disabled:opacity-40 transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          {/* Quick Stage Selection for Client HR */}
          <div className="pt-2 border-t border-border/60">
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
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                      isCurrent
                        ? `${s.color} font-bold ring-1 ring-violet-500`
                        : "bg-sand/40 border-border/80 text-muted-foreground hover:bg-sand hover:text-ink"
                    )}
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
  dataUrl,
}: {
  candidateId: string;
  lang: string;
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
  }, [candidateId, lang, dataUrl]);

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
    <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 shadow-2xs">
      <audio
        ref={audioRef}
        src={src || undefined}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`size-7 rounded-full flex items-center justify-center transition-colors ${
          isPlaying ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
        title={isPlaying ? "Pause" : "Play Voice Note"}
      >
        {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-slate-800 truncate">
          {lang} Note
        </div>
        <div className="text-[9px] text-muted-foreground flex items-center gap-1 font-mono">
          <span>{isPlaying ? "Playing..." : "Ready to listen"}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        title="Playback Speed"
      >
        {speed}x
      </button>
    </div>
  );
}
