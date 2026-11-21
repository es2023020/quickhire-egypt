import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Users, CheckCircle2, Clock, Volume2, Play, Pause,
  Download, Share2, MapPin, ExternalLink, FileText, Search,
  ChevronDown, AlertTriangle, Sparkles, MessageCircle, RefreshCw,
  Calendar, ShieldCheck, ArrowUpRight, DollarSign, Receipt,
  Check, X, ThumbsUp, ChevronRight, Award, Briefcase, Phone, Mail
} from "lucide-react";
import { toast } from "sonner";
import { QuickHireLogo } from "@/components/logo";
import { openDocumentSafely, downloadDocumentSafely } from "@/lib/document-utils";
import { OUTCOME_CODES, getOutcomeDefinition } from "@/lib/outcome-codes";
import { generateCandidateAccessCode } from "@/lib/candidate-access";
import { cn } from "@/lib/utils";

const PARTNER_COMPANIES = [
  "All Accounts",
  "Vodafone UK",
  "Concentrix",
  "Sutherland",
  "Teleperformance",
  "Raya CX",
  "Webhelp",
] as const;

export const Route = createFileRoute("/employer")({
  head: () => ({
    meta: [
      { title: "Employer Portal & Placements Sign-off — QuickHire Egypt" },
      { name: "description", content: "Corporate portal for partner BPO hiring managers to evaluate candidates, manage interview waves, and sign off on monthly placements." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployerPortalPage,
});

function EmployerPortalPage() {
  const qc = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string>("All Accounts");
  const [activeMainTab, setActiveMainTab] = useState<"pipeline" | "waves" | "billing">("pipeline");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const companyParam = selectedCompany === "All Accounts" ? "all" : selectedCompany;

  const workspaceQuery = useQuery({
    queryKey: ["employer", "workspace", companyParam],
    queryFn: async () => {
      const res = await fetch(`/api/employer?company=${encodeURIComponent(companyParam)}`);
      if (!res.ok) throw new Error("Failed to load employer workspace");
      return res.json();
    },
  });

  const updateDecisionMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      outcome_code?: string | null;
      status?: string;
      outcome_notes?: string | null;
    }) => {
      const res = await fetch("/api/employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to update candidate decision");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer", "workspace"] });
      toast.success("Candidate hiring decision saved successfully!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    },
  });

  const signoffPlacementsMutation = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      const res = await fetch("/api/employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signoff_placements",
          candidateIds,
          company: selectedCompany,
        }),
      });
      if (!res.ok) throw new Error("Failed to sign off on placements");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employer", "workspace"] });
      toast.success(data.message || "Placements approved for corporate monthly invoicing!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Sign-off failed");
    },
  });

  const data = workspaceQuery.data;
  const metrics = data?.metrics || {
    totalCandidates: 0,
    scheduledCount: 0,
    hiredCount: 0,
    backupCount: 0,
    pendingCount: 0,
    totalPlacementsCount: 0,
    totalBillableEgp: 0,
    approvedPlacementsCount: 0,
  };

  const candidates: any[] = data?.candidates || [];
  const waves: string[] = data?.waves || [];
  const placements: any[] = data?.placements || [];

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.english_level?.toLowerCase().includes(q) ||
          c.offer?.title?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (statusFilter === "scheduled") return Boolean(c.interview_date);
      if (statusFilter === "hired") return c.status === "hired" || c.outcome_code?.startsWith("passed");
      if (statusFilter === "backup") return c.outcome_code === "passed_backup" || c.status === "shortlisted";
      if (statusFilter === "pending") return !c.outcome_code && c.status !== "rejected" && c.status !== "hired";
      return true;
    });
  }, [candidates, search, statusFilter]);

  function exportBillingCsv() {
    if (!placements.length) {
      toast.error("No placements to export");
      return;
    }

    const headers = [
      "Candidate Name",
      "Phone",
      "Email",
      "Position Title",
      "Company Account",
      "Language Tier",
      "Hire Date",
      "Interview Wave",
      "Placement Fee (EGP)",
      "Fee Tier Category",
      "Billing Status",
      "Employer Sign-off Status",
    ];

    const rows = placements.map((p) => [
      `"${p.candidateName}"`,
      `"${p.candidatePhone}"`,
      `"${p.candidateEmail}"`,
      `"${p.offerTitle}"`,
      `"${p.company}"`,
      `"${p.language}"`,
      `"${p.hiredDate?.slice(0, 10) || ""}"`,
      `"${p.waveTag}"`,
      `"${p.placementFeeEgp}"`,
      `"${p.feeTier}"`,
      `"${p.billingStatus}"`,
      `"${p.billingStatus === "approved" ? "Signed Off by HR" : "Pending Sign-off"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickHire_Corporate_Billing_${selectedCompany.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Billing and placement statement exported!");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Corporate Header ── */}
      <header className="border-b border-white/10 bg-surface-1 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <QuickHireLogo size={36} className="rounded-xl shadow-[0_0_15px_rgba(182,255,46,0.35)]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-white tracking-tight">Quick<span className="text-primary">Hire</span></span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                  Corporate Employer Workspace
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Direct Talent Review, Wave Management &amp; Placement Sign-Off</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => workspaceQuery.refetch()}
              title="Refresh Workspace"
              className="rounded-xl border border-white/10 bg-surface-2 p-2 text-zinc-400 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("size-4", workspaceQuery.isFetching && "animate-spin text-primary")} />
            </button>
            <Link
              to="/offers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors"
            >
              <span>View Public Openings</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Partner Account Switcher Bar ── */}
      <div className="border-b border-white/10 bg-surface-2 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" /> Hiring Account:
            </span>
            {PARTNER_COMPANIES.map((company) => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                  selectedCompany === company
                    ? "bg-primary text-black border-primary font-bold shadow-sm"
                    : "bg-surface-1 border-white/5 text-zinc-400 hover:text-white hover:bg-surface-3"
                )}
              >
                {company}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
            <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Enterprise Agreement</span>
          </div>
        </div>
      </div>

      {/* ── Top Main Navigation Tabs ── */}
      <div className="border-b border-white/10 bg-surface-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab("pipeline")}
            className={cn(
              "py-4 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeMainTab === "pipeline"
                ? "border-primary text-primary"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <Users className="size-4" />
            <span>Candidate Pipeline &amp; Review (Phase 1)</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
              {metrics.totalCandidates}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("waves")}
            className={cn(
              "py-4 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeMainTab === "waves"
                ? "border-primary text-primary"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <Calendar className="size-4" />
            <span>Interview Cohort Waves</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
              {waves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("billing")}
            className={cn(
              "py-4 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeMainTab === "billing"
                ? "border-primary text-primary"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <Receipt className="size-4" />
            <span>Placements &amp; Billing Sign-Off (Phase 4)</span>
            <span className="rounded-full bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-mono font-bold">
              {metrics.totalPlacementsCount} Hired
            </span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ══════════════════════════════════════════════════════════════
            TAB 1: CANDIDATE PIPELINE & DOSSIER REVIEW (PHASE 1)
           ══════════════════════════════════════════════════════════════ */}
        {activeMainTab === "pipeline" && (
          <div className="space-y-6">
            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Total Applicants in Funnel</span>
                <div className="font-display text-3xl font-bold text-white mt-1 font-mono">
                  {metrics.totalCandidates}
                </div>
                <div className="text-[11px] text-primary mt-1">Ready for Account Review</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Scheduled for Wave Interview</span>
                <div className="font-display text-3xl font-bold text-primary mt-1 font-mono">
                  {metrics.scheduledCount}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Confirmed with Gate Passes</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Offers Extended / Hired</span>
                <div className="font-display text-3xl font-bold text-emerald-400 mt-1 font-mono">
                  {metrics.hiredCount}
                </div>
                <div className="text-[11px] text-emerald-400/80 mt-1">Confirmed Placements</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Bench / Wave Backups</span>
                <div className="font-display text-3xl font-bold text-blue-400 mt-1 font-mono">
                  {metrics.backupCount}
                </div>
                <div className="text-[11px] text-blue-400/80 mt-1">Available for Sudden Call-offs</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-surface-1 border border-white/10 rounded-xl overflow-x-auto w-full sm:w-auto">
                {[
                  { key: "all", label: `All Candidates (${candidates.length})` },
                  { key: "scheduled", label: `Wave Scheduled (${metrics.scheduledCount})` },
                  { key: "hired", label: `Offers Extended (${metrics.hiredCount})` },
                  { key: "backup", label: `Bench Backups (${metrics.backupCount})` },
                  { key: "pending", label: `Pending Decision (${metrics.pendingCount})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                      statusFilter === tab.key
                        ? "bg-primary text-black font-bold shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-surface-2"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search candidate name, phone, CEFR..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Candidate Cards Roster */}
            {workspaceQuery.isLoading ? (
              <div className="p-16 rounded-2xl bg-surface-1 border border-white/10 text-center shadow-sm">
                <RefreshCw className="size-7 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Loading candidate workspace...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-16 rounded-2xl bg-surface-1 border border-white/10 text-center shadow-sm">
                <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No candidates in this view</h3>
                <p className="text-xs text-muted-foreground mt-1">Try resetting the status filter or company account.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCandidates.map((candidate) => (
                  <EmployerCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onUpdateDecision={(params) => updateDecisionMutation.mutate({ id: candidate.id, ...params })}
                    isUpdating={updateDecisionMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: ACTIVE INTERVIEW WAVES
           ══════════════════════════════════════════════════════════════ */}
        {activeMainTab === "waves" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Assessment Cohort Waves</h3>
                <p className="text-xs text-muted-foreground">
                  Interview days and gate pass rosters managed for {selectedCompany}
                </p>
              </div>
              <Link
                to="/wave/$waveTag"
                params={{ waveTag: "all" }}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-black hover:bg-[#c2ff47] transition-all shadow-sm"
              >
                <span>Open Master Wave Gate (/wave/all)</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            {waves.length === 0 ? (
              <div className="p-16 rounded-2xl bg-surface-1 border border-white/10 text-center shadow-sm">
                <Calendar className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No interview waves active yet</h3>
                <p className="text-xs text-muted-foreground mt-1">Wave tags are created when candidates are scheduled for assessment days.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {waves.map((wave) => {
                  const waveCandidates = candidates.filter((c) => c.wave_tag === wave);
                  const attended = waveCandidates.filter((c) => c.interview_attendance === "attended").length;
                  const hired = waveCandidates.filter((c) => c.status === "hired" || c.outcome_code?.startsWith("passed")).length;

                  return (
                    <div key={wave} className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm space-y-4 hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-lg">
                          {wave}
                        </span>
                        <span className="text-xs font-semibold text-zinc-300">
                          {waveCandidates.length} Candidates
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-surface-2 p-2.5 rounded-xl border border-white/5">
                          <span className="text-muted-foreground block text-[10px]">Checked-in</span>
                          <strong className="text-emerald-400 font-mono text-base">{attended}</strong>
                        </div>
                        <div className="bg-surface-2 p-2.5 rounded-xl border border-white/5">
                          <span className="text-muted-foreground block text-[10px]">Offers</span>
                          <strong className="text-primary font-mono text-base">{hired}</strong>
                        </div>
                      </div>

                      <Link
                        to="/wave/$waveTag"
                        params={{ waveTag: wave }}
                        target="_blank"
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-2 text-xs font-semibold text-white hover:bg-surface-3 transition-colors"
                      >
                        <span>Open Wave Assessment Gate</span>
                        <ExternalLink className="size-3 text-primary" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: PLACEMENTS & BILLING SIGN-OFF (PHASE 4)
           ══════════════════════════════════════════════════════════════ */}
        {activeMainTab === "billing" && (
          <div className="space-y-6">
            {/* Billing Stats Strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Total Hired Placements</span>
                <div className="font-display text-3xl font-bold text-white mt-1 font-mono">
                  {metrics.totalPlacementsCount}
                </div>
                <div className="text-[11px] text-primary mt-1">Confirmed Starters</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Total Billable Fee Value</span>
                <div className="font-display text-3xl font-bold text-emerald-400 mt-1 font-mono">
                  {metrics.totalBillableEgp.toLocaleString()} <span className="text-sm font-sans">EGP</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Based on Contract Tiers</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Approved for Invoicing</span>
                <div className="font-display text-3xl font-bold text-primary mt-1 font-mono">
                  {metrics.approvedPlacementsCount} / {metrics.totalPlacementsCount}
                </div>
                <div className="text-[11px] text-primary/80 mt-1">Signed Off by Company HR</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm">
                <span className="text-xs font-medium text-zinc-400">Pending HR Sign-off</span>
                <div className="font-display text-3xl font-bold text-amber-400 mt-1 font-mono">
                  {metrics.totalPlacementsCount - metrics.approvedPlacementsCount}
                </div>
                <div className="text-[11px] text-amber-400/80 mt-1">Awaiting Monthly Sign-off</div>
              </div>
            </div>

            {/* Corporate Actions Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div>
                <h4 className="text-base font-bold text-white">Monthly Cohort Placement Approval</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review and sign off on hired candidates for {selectedCompany}. Once approved, QuickHire Finance will generate the official tax invoice.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={exportBillingCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2 text-xs font-semibold text-white hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  <Download className="size-3.5 text-primary" />
                  Export Signed CSV
                </button>

                <button
                  type="button"
                  disabled={
                    signoffPlacementsMutation.isPending ||
                    placements.filter((p) => p.billingStatus !== "approved").length === 0
                  }
                  onClick={() => {
                    const pendingIds = placements
                      .filter((p) => p.billingStatus !== "approved")
                      .map((p) => p.candidateId);
                    signoffPlacementsMutation.mutate(pendingIds);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black hover:bg-[#c2ff47] disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  <Check className="size-4" />
                  <span>Approve All ({placements.filter((p) => p.billingStatus !== "approved").length}) for Invoicing</span>
                </button>
              </div>
            </div>

            {/* Placements Table */}
            {placements.length === 0 ? (
              <div className="p-16 rounded-2xl bg-surface-1 border border-white/10 text-center shadow-sm">
                <Receipt className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No billable placements recorded</h3>
                <p className="text-xs text-muted-foreground mt-1">When an applicant is marked as "Offer Extended / Hired", they will appear here.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-surface-2 text-zinc-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">Candidate</th>
                        <th className="p-3.5">Hired Position</th>
                        <th className="p-3.5">Language Tier</th>
                        <th className="p-3.5">Placement Date</th>
                        <th className="p-3.5">Agreed Fee (EGP)</th>
                        <th className="p-3.5">Sign-Off Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {placements.map((p) => (
                        <tr key={p.candidateId} className="hover:bg-surface-2/60 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{p.candidateName}</div>
                            <div className="text-[11px] font-mono text-zinc-400">{p.candidatePhone}</div>
                          </td>
                          <td className="p-3.5 font-medium text-white">{p.offerTitle}</td>
                          <td className="p-3.5">
                            <span className="rounded-md bg-surface-3 border border-white/10 px-2 py-0.5 text-[11px] text-zinc-200">
                              {p.language}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {p.hiredDate ? new Date(p.hiredDate).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-primary">
                            {p.placementFeeEgp.toLocaleString()} EGP
                          </td>
                          <td className="p-3.5">
                            {p.billingStatus === "approved" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                                <Check className="size-3" /> Approved by HR
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                                <Clock className="size-3" /> Pending Sign-Off
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {p.billingStatus !== "approved" && (
                              <button
                                type="button"
                                onClick={() => signoffPlacementsMutation.mutate([p.candidateId])}
                                className="rounded-lg bg-surface-2 hover:bg-surface-3 border border-white/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors cursor-pointer"
                              >
                                Sign Off
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Employer Candidate Review Card Component (Phase 1)
   ───────────────────────────────────────────────────────────── */
function EmployerCandidateCard({
  candidate,
  onUpdateDecision,
  isUpdating,
}: {
  candidate: any;
  onUpdateDecision: (params: {
    outcome_code?: string | null;
    status?: string;
    outcome_notes?: string | null;
  }) => void;
  isUpdating: boolean;
}) {
  const [notes, setNotes] = useState(candidate.outcome_notes || "");
  const [showNotesInput, setShowNotesInput] = useState(false);

  const activeOutcome = candidate.outcome_code ? getOutcomeDefinition(candidate.outcome_code) : null;
  const accessCode = generateCandidateAccessCode(candidate.id);
  const dossierUrl = `/c/${candidate.id}?code=${accessCode}`;
  const cvTarget = (candidate.cv_path?.startsWith("http") ? candidate.cv_path : candidate.cv_data) || "/placeholder-cv.pdf";

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-sm hover:border-white/20 transition-all space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        {/* Candidate Summary */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-white tracking-tight">{candidate.full_name}</h4>
            {candidate.english_level && (
              <span className="rounded-full bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 text-xs font-bold">
                {candidate.english_level}
              </span>
            )}
            {candidate.total_score != null && (
              <span className="rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold">
                AI Score: {candidate.total_score}/30
              </span>
            )}
            {activeOutcome && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold border", activeOutcome.badgeStyle)}>
                {activeOutcome.shortLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>💼 <strong className="text-white">{candidate.offer?.title || "Customer Specialist"}</strong></span>
            <span>📱 <span className="font-mono text-zinc-300">{candidate.phone}</span></span>
            {candidate.location && <span>📍 {candidate.location}</span>}
            {candidate.experience_years != null && <span>⌛ {candidate.experience_years}y Exp</span>}
          </div>

          {/* Voice Notes Audio Player */}
          {candidate.voice_notes && candidate.voice_notes.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {candidate.voice_notes.map((vn: any, i: number) => (
                <div key={vn.path || i} className="inline-flex items-center gap-2 rounded-lg bg-surface-2 border border-white/10 px-3 py-1.5 text-xs">
                  <Volume2 className="size-3.5 text-primary" />
                  <span className="font-bold text-white">{vn.lang?.toUpperCase()} Audio</span>
                  <audio src={vn.path?.startsWith("http") ? vn.path : vn.data || "/placeholder-audio.mp3"} controls className="h-6 w-36 ml-1" />
                </div>
              ))}
            </div>
          )}

          {/* CV Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => openDocumentSafely(cvTarget, `${candidate.full_name.replace(/\s+/g, "_")}_CV.pdf`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-primary" />
              <span>Preview Resume (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadDocumentSafely(cvTarget, `${candidate.full_name.replace(/\s+/g, "_")}_CV.pdf`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
              title="Download CV"
            >
              <Download className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Employer Decision Panel Column */}
        <div className="lg:w-80 shrink-0 space-y-2.5 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Employer Hiring Action
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateDecision({ outcome_code: "passed_offer", status: "hired" })}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 transition-colors shadow-sm cursor-pointer"
            >
              <ThumbsUp className="size-3.5" /> Extend Offer 🎉
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateDecision({ outcome_code: "passed_backup", status: "shortlisted" })}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 px-3 transition-colors shadow-sm cursor-pointer"
            >
              <Clock className="size-3.5" /> Bench Backup ⏳
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              to="/c/$id"
              params={{ id: candidate.id }}
              search={{ code: accessCode }}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              <span>Full Dossier &amp; Scorecard</span>
              <ExternalLink className="size-3" />
            </Link>

            <button
              type="button"
              onClick={() => setShowNotesInput(!showNotesInput)}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer underline"
            >
              {showNotesInput ? "Hide Notes" : "Add Note"}
            </button>
          </div>

          {showNotesInput && (
            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Write interviewer feedback..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateDecision({ outcome_notes: notes });
                  toast.success("Feedback note saved");
                }}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-black hover:bg-[#c2ff47] cursor-pointer"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
