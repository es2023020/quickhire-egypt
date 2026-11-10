import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Loader2, Users, ChevronRight, Search,
  MessageCircle, Mail, Phone, Star, TrendingUp,
  CheckCircle2, XCircle, ArrowUpDown, RefreshCw,
  Trash2, Mic, FileText, Calendar, CalendarCheck, Bus,
  CheckSquare, Square, Download, Layers, Tag, ShieldAlert, Check, X, Gift,
  Kanban, List, AlertTriangle, Clock, ArrowUpRight, Share2,
} from "lucide-react";
import { OUTCOME_CODES, getOutcomeDefinition } from "@/lib/outcome-codes";
import { checkCandidateCooldown } from "@/lib/cooldown-engine";
import {
  adminListApplications,
  adminUpdateApplicationStatus,
  adminDeleteApplication,
  adminBulkUpdateStatus,
  adminBulkAssignWave,
  adminBulkDeleteApplications,
} from "@/lib/applications.functions";
import { adminListOffers } from "@/lib/offers.functions";
import { exportClientRosterCsv } from "@/lib/client-roster-export";
import { ScorePill } from "@/components/score-pill";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/applicants/")({
  head: () => ({ meta: [{ title: "Applicants — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: Applicants,
});

const STATUS_STYLES = {
  new: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  shortlisted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  hired: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
} as const;

const STATUS_LABELS = {
  new: "New",
  shortlisted: "Shortlisted ⭐",
  hired: "Hired ✓",
  rejected: "Rejected",
} as const;

export const PIPELINE_STAGES = [
  { key: "applied", label: "Applied / New", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { key: "interview_scheduled", label: "Interview Scheduled", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { key: "interview_done", label: "Interview Done / Evaluation", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  { key: "test_invited", label: "Test Sent / Invited", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { key: "test_completed", label: "Test Completed", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { key: "offer_pending", label: "Offer Pending", color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  { key: "offer_extended", label: "Offer Extended", color: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  { key: "accepted", label: "Accepted / Placed", color: "bg-primary/15 text-primary border-primary/30" },
  { key: "rejected", label: "Rejected / Archived", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-white/10 text-zinc-400 border-white/15" },
] as const;

function waLink(phone: string, name: string, role: string) {
  const normalized = phone.replace(/[^0-9+]/g, "");
  const msg = `Hi ${name}, this is QuickHire regarding your application for ${role}. Are you available for a quick call?`;
  return `https://wa.me/${normalized.startsWith("+") ? normalized.slice(1) : normalized}?text=${encodeURIComponent(msg)}`;
}

function emailLink(email: string, name: string, role: string) {
  const subject = encodeURIComponent(`Your application for ${role} — QuickHire`);
  const body = encodeURIComponent(`Hi ${name},\n\nThank you for applying for the ${role} role through QuickHire.\n\nWe have reviewed your application and would like to move forward.\n\nBest regards,\nQuickHire Recruitment Team`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function Applicants() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");
  const [referralFilter, setReferralFilter] = useState<string>("all");
  const [cooldownFilter, setCooldownFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [waveFilter, setWaveFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "date" | "name">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [waveTagInput, setWaveTagInput] = useState("");
  const [showBulkDelete, setShowBulkDelete] = useState(false);

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
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteApp = useMutation({
    mutationFn: (id: string) => adminDeleteApplication({ data: { id } }),
    onSuccess: () => {
      toast.success("Applicant deleted");
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: ({ ids, s }: { ids: string[]; s: "new" | "shortlisted" | "rejected" | "hired" }) =>
      adminBulkUpdateStatus({ data: { ids, status: s } }),
    onSuccess: (res) => {
      toast.success(`Updated ${res.updated} applicants`);
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setSelectedIds(new Set());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Bulk update failed"),
  });

  const bulkAssignWave = useMutation({
    mutationFn: ({ ids, tag }: { ids: string[]; tag: string }) =>
      adminBulkAssignWave({ data: { ids, wave_tag: tag } }),
    onSuccess: (res) => {
      toast.success(`Wave tag assigned to ${res.updated} applicants`);
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      setSelectedIds(new Set());
      setWaveTagInput("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Wave assign failed"),
  });

  const bulkDeleteApps = useMutation({
    mutationFn: (ids: string[]) => adminBulkDeleteApplications({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(`Deleted ${res.deleted} applicants`);
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Bulk delete failed"),
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
    if (attendanceFilter !== "all") {
      if (attendanceFilter === "scheduled") {
        list = list.filter(a => !!a.interview_date);
      } else {
        list = list.filter(a => (a.interview_attendance || "pending") === attendanceFilter && !!a.interview_date);
      }
    }
    if (referralFilter !== "all") {
      if (referralFilter === "referred") {
        list = list.filter(a => !!a.referred_by);
      } else if (referralFilter === "direct") {
        list = list.filter(a => !a.referred_by);
      }
    }
    if (cooldownFilter !== "all") {
      list = list.filter(a => {
        const check = checkCandidateCooldown(a, apps.data || []);
        if (cooldownFilter === "risk") return check.hasCooldownRisk;
        if (cooldownFilter === "clear") return !check.hasCooldownRisk;
        return true;
      });
    }
    if (outcomeFilter !== "all") {
      list = list.filter(a => a.outcome_code === outcomeFilter);
    }
    if (waveFilter !== "all") {
      list = list.filter(a => (a.wave_tag || "").toLowerCase() === waveFilter.toLowerCase());
    }
    if (stageFilter !== "all") {
      list = list.filter(a => (a.pipeline_stage || "applied") === stageFilter);
    }
    list = [...list].sort((a, b) => {
      let v = 0;
      if (sortBy === "score") v = (a.total_score ?? -1) - (b.total_score ?? -1);
      else if (sortBy === "date") v = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else v = a.full_name.localeCompare(b.full_name);
      return sortDir === "desc" ? -v : v;
    });
    return list;
  }, [apps.data, search, attendanceFilter, referralFilter, cooldownFilter, outcomeFilter, waveFilter, stageFilter, sortBy, sortDir]);

  const availableWaves = useMemo(() => {
    const set = new Set<string>();
    (apps.data || []).forEach(a => {
      if (a.wave_tag) set.add(a.wave_tag);
    });
    return Array.from(set).sort();
  }, [apps.data]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  const total = rows.length;
  const shortlisted = (apps.data ?? []).filter(a => a.status === "shortlisted").length;
  const hired = (apps.data ?? []).filter(a => a.status === "hired").length;

  const kanbanColumns = useMemo(() => {
    return [
      {
        id: "new",
        title: "New Submissions",
        badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        items: rows.filter((r) => r.status === "new" && !r.interview_date),
      },
      {
        id: "shortlisted",
        title: "Shortlisted ⭐",
        badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        items: rows.filter((r) => r.status === "shortlisted" && !r.interview_date),
      },
      {
        id: "scheduled",
        title: "Wave Scheduled 📅",
        badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
        items: rows.filter((r) => !!r.interview_date && r.status !== "hired" && r.status !== "rejected"),
      },
      {
        id: "hired",
        title: "Hired / Offer 🎉",
        badgeColor: "bg-primary/15 text-primary border-primary/30",
        items: rows.filter((r) => r.status === "hired"),
      },
      {
        id: "rejected",
        title: "Archived / Rejected",
        badgeColor: "bg-red-500/15 text-red-400 border-red-500/30",
        items: rows.filter((r) => r.status === "rejected"),
      },
    ];
  }, [rows]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1500px] mx-auto bg-background text-foreground space-y-6">
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-surface-1 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 border border-red-500/30">
                <Trash2 className="size-5 text-red-400" />
              </div>
              <div>
                <div className="font-bold text-white text-base">Delete Applicant?</div>
                <div className="text-xs text-muted-foreground">This action cannot be undone.</div>
              </div>
            </div>
            <p className="text-xs text-[#E4E4E7]/80 mb-5">
              All data including scores, voice notes, and assessments will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteApp.mutate(deleteConfirm)}
                disabled={deleteApp.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {deleteApp.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Delete Record
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-surface-1 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 border border-red-500/30">
                <Trash2 className="size-5 text-red-400" />
              </div>
              <div>
                <div className="font-bold text-white text-base">Delete {selectedIds.size} applicants?</div>
                <div className="text-xs text-muted-foreground">This action cannot be undone.</div>
              </div>
            </div>
            <p className="text-xs text-[#E4E4E7]/80 mb-5">
              All data for the selected candidates will be permanently removed from the system.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => bulkDeleteApps.mutate([...selectedIds])}
                disabled={bulkDeleteApps.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {bulkDeleteApps.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Delete Selected
              </button>
              <button
                onClick={() => setShowBulkDelete(false)}
                className="flex-1 rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono mb-2">
            <Users className="size-3.5" /> TALENT ROSTER
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Candidates &amp; Applications
          </h1>
          <p className="mt-1 text-sm text-[#E4E4E7]/80">
            {total} candidate{total !== 1 ? "s" : ""} registered · <strong className="text-amber-400">{shortlisted} shortlisted</strong> · <strong className="text-primary">{hired} placed &amp; hired</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-white/10 bg-surface-1 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                viewMode === "table" ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.3)]" : "text-zinc-400 hover:text-white"
              )}
            >
              <List className="size-3.5" /> Table View
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.3)]" : "text-zinc-400 hover:text-white"
              )}
            >
              <Kanban className="size-3.5" /> Stage Kanban
            </button>
          </div>

          <button
            onClick={() => exportClientRosterCsv(rows, "Full_View_Roster")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
          >
            <Download className="size-3.5" /> Export View CSV
          </button>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "applications"] })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-primary/30 bg-surface-2 px-4 py-3 shadow-xl animate-in fade-in">
          <span className="text-xs font-bold font-mono text-primary mr-1">
            {selectedIds.size} candidates selected:
          </span>
          <button
            onClick={() => exportClientRosterCsv(rows.filter(r => selectedIds.has(r.id)), "Selection_Roster")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Download className="size-3.5" /> Export Selected CSV
          </button>
          <button
            onClick={() => bulkUpdateStatus.mutate({ ids: [...selectedIds], s: "shortlisted" })}
            disabled={bulkUpdateStatus.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {bulkUpdateStatus.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />}
            Shortlist Selected
          </button>
          <button
            onClick={() => bulkUpdateStatus.mutate({ ids: [...selectedIds], s: "hired" })}
            disabled={bulkUpdateStatus.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-[#c2ff47] transition-colors disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="size-3.5" /> Mark Placed &amp; Hired
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-40">
            <input
              value={waveTagInput}
              onChange={(e) => setWaveTagInput(e.target.value)}
              placeholder="Wave tag (e.g. Wave-3-Concentrix)"
              className="flex-1 rounded-xl border border-white/10 bg-surface-1 px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-primary/80"
            />
            <button
              onClick={() => { if (waveTagInput.trim()) bulkAssignWave.mutate({ ids: [...selectedIds], tag: waveTagInput.trim() }); }}
              disabled={!waveTagInput.trim() || bulkAssignWave.isPending}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Tag className="size-3.5" /> Assign Wave
            </button>
          </div>
          <button
            onClick={() => setShowBulkDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/25 transition-colors ml-auto cursor-pointer"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="rounded-xl border border-white/10 bg-surface-1 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name, phone, role, email…"
            className="w-full rounded-xl border border-white/10 bg-surface-1 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 shadow-xl"
          />
        </div>
        <select
          value={offerFilter}
          onChange={(e) => setOfferFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Roles &amp; Openings</option>
          {offers.data?.map((o) => (
            <option key={o.id} value={o.id} className="bg-surface-1">{o.title} ({o.company})</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Statuses</option>
          {["new", "shortlisted", "hired", "rejected"].map((s) => (
            <option key={s} value={s} className="bg-surface-1">{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>
          ))}
        </select>
        <select
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Interviews</option>
          <option value="scheduled" className="bg-surface-1">Scheduled Wave</option>
          <option value="confirmed" className="bg-surface-1">🟢 Confirmed Attendance</option>
          <option value="pending" className="bg-surface-1">🟡 Pending Confirmation</option>
          <option value="attended" className="bg-surface-1">🔵 Attended On-Site</option>
          <option value="no_show" className="bg-surface-1">🔴 No-Shows</option>
        </select>
        <select
          value={referralFilter}
          onChange={(e) => setReferralFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Channels</option>
          <option value="referred" className="bg-surface-1">🎁 Ambassador Referrals</option>
          <option value="direct" className="bg-surface-1">Direct / Organic</option>
        </select>
        <select
          value={cooldownFilter}
          onChange={(e) => setCooldownFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Cooldown Statuses</option>
          <option value="risk" className="bg-surface-1">⚠️ 90-Day Cooldown Risks</option>
          <option value="clear" className="bg-surface-1">Clear (No History)</option>
        </select>
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Outcome Codes</option>
          {OUTCOME_CODES.map((o) => (
            <option key={o.code} value={o.code} className="bg-surface-1">
              {o.shortLabel}
            </option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
        >
          <option value="all" className="bg-surface-1">All Pipeline Stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.key} value={s.key} className="bg-surface-1">
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <select
            value={waveFilter}
            onChange={(e) => setWaveFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2.5 text-sm text-white outline-none focus:border-primary/80"
          >
            <option value="all" className="bg-surface-1">All Waves</option>
            {availableWaves.map((w) => (
              <option key={w} value={w} className="bg-surface-1">
                Wave: {w}
              </option>
            ))}
          </select>
          {waveFilter !== "all" && (
            <a
              href={`/wave/${encodeURIComponent(waveFilter)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors shadow-soft"
            >
              Open Wave Link <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Content: Loading, Empty, Pipeline Board, or Table */}
      {apps.isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft flex flex-col items-center justify-center p-16 text-center">
          <Users className="size-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No applicants match these filters.</p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1280px]">
            {kanbanColumns.map((col) => (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl border border-border/80 bg-sand/30 p-3.5 w-72 lg:w-80 flex-shrink-0"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border", col.badgeColor)}>
                    {col.title}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border shadow-xs">
                    {col.items.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 overflow-y-auto max-h-[72vh] pr-1">
                  {col.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground/60 bg-white/40">
                      No candidates in this stage
                    </div>
                  ) : (
                    col.items.map((a) => {
                      const cooldown = checkCandidateCooldown(a, apps.data || []);
                      return (
                        <div
                          key={a.id}
                          onClick={() => navigate({ to: "/admin/applicants/$id", params: { id: a.id } })}
                          className="rounded-xl border border-border/80 bg-white p-3.5 shadow-xs hover:shadow-soft hover:border-primary/40 transition-all cursor-pointer group space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-ink text-sm group-hover:text-primary transition-colors truncate">
                                {a.full_name}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {a.offer?.title ?? "General Application"}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {a.offer?.company}
                              </div>
                            </div>
                            <ScorePill score={a.total_score != null ? Math.round((a.total_score / 30) * 10) : null} />
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {cooldown.hasCooldownRisk && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300"
                                title={cooldown.reason || "90-day cooldown alert"}
                              >
                                <AlertTriangle className="size-2.5 text-amber-600" /> 90d Cooldown
                              </span>
                            )}
                            {a.interview_date && (
                              <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200">
                                <Calendar className="size-2.5" /> {a.interview_date} ({a.interview_time || "11:30 AM"})
                              </span>
                            )}
                            {a.interview_attendance && a.interview_attendance !== "pending" && (
                              <span className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border",
                                a.interview_attendance === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                a.interview_attendance === "attended" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                              )}>
                                {a.interview_attendance}
                              </span>
                            )}
                            {a.wave_tag && (
                              <a
                                href={`/wave/${encodeURIComponent(a.wave_tag)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded bg-sand px-1.5 py-0.5 text-[10px] font-mono font-semibold text-violet-700 border border-violet-200 hover:bg-violet-50 transition-colors"
                                title="Open Client Wave Portal"
                              >
                                <Tag className="size-2.5 text-violet-600" /> {a.wave_tag} ↗
                              </a>
                            )}
                            {a.referred_by && (
                              <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-violet-800">
                                <Gift className="size-2.5 text-violet-600" /> {a.referred_by}
                              </span>
                            )}
                            {a.outcome_code && (
                              <span className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border",
                                getOutcomeDefinition(a.outcome_code)?.badgeStyle || "bg-sand text-ink border-border"
                              )}>
                                {getOutcomeDefinition(a.outcome_code)?.shortLabel || a.outcome_code}
                              </span>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={a.status}
                              onChange={(e) => updateStatus.mutate({ id: a.id, s: e.target.value as any })}
                              className="rounded-lg border border-border bg-sand/60 px-2 py-1 text-[11px] font-medium text-ink outline-none cursor-pointer"
                            >
                              <option value="new">Move: New</option>
                              <option value="shortlisted">Move: Shortlist ⭐</option>
                              <option value="hired">Move: Hired 🎉</option>
                              <option value="rejected">Move: Reject</option>
                            </select>

                            <div className="flex items-center gap-1">
                              <a
                                href={waLink(a.phone, a.full_name, a.offer?.title ?? "the role")}
                                target="_blank"
                                rel="noreferrer"
                                className="grid size-6 place-items-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                title="WhatsApp candidate"
                              >
                                <MessageCircle className="size-3" />
                              </a>
                              <Link
                                to="/admin/applicants/$id"
                                params={{ id: a.id }}
                                className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground hover:text-ink transition-colors"
                                title="Open full profile"
                              >
                                <ChevronRight className="size-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface-1 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/80 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-white/10">
                <tr>
                  <th className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every(r => selectedIds.has(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(rows.map(r => r.id)));
                        else setSelectedIds(new Set());
                      }}
                      className="size-4 rounded cursor-pointer accent-primary"
                      title="Select all"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                      Candidate <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">English</th>
                  <th className="px-4 py-3">Comm</th>
                  <th className="px-4 py-3">Exp</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort("score")} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                      Total <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Interview Wave</th>
                  <th className="px-4 py-3">Assets</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                      Date <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((a) => (
                  <tr 
                    key={a.id} 
                    onClick={() => navigate({ to: "/admin/applicants/$id", params: { id: a.id } })}
                    className={cn(
                      "hover:bg-surface-2/50 transition-colors group cursor-pointer",
                      selectedIds.has(a.id) && "bg-primary/[0.04]"
                    )}
                  >
                    <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(a.id);
                          else next.delete(a.id);
                          setSelectedIds(next);
                        }}
                        className="size-4 rounded cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 shrink-0 flex items-center justify-center rounded-xl bg-surface-2 border border-white/10 text-primary text-xs font-bold font-mono">
                          {a.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{a.full_name}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                          <div className="text-xs text-muted-foreground font-mono">{a.phone}</div>
                          {a.referred_by && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary border border-primary/20">
                                <Gift className="size-2.5" /> Ref: {a.referred_by}
                              </span>
                            </div>
                          )}
                          {(() => {
                            const cooldown = checkCandidateCooldown(a, apps.data || []);
                            if (cooldown.hasCooldownRisk) {
                              return (
                                <div className="mt-1" title={cooldown.reason || "90-day cooldown risk"}>
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                                    <AlertTriangle className="size-2.5 text-amber-400" /> 90d Cooldown
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-semibold text-xs">{a.offer?.title ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{a.offer?.company}</div>
                    </td>
                    <td className="px-4 py-3"><ScorePill score={a.english_score} /></td>
                    <td className="px-4 py-3"><ScorePill score={a.comm_score} /></td>
                    <td className="px-4 py-3"><ScorePill score={a.exp_score} /></td>
                    <td className="px-4 py-3">
                      <span className={cn("font-display text-base font-extrabold font-mono",
                        a.total_score == null ? "text-muted-foreground" :
                        a.total_score >= 25 ? "text-primary" :
                        a.total_score >= 20 ? "text-blue-400" :
                        a.total_score >= 15 ? "text-amber-400" : "text-red-400"
                      )}>
                        {a.total_score != null ? `${a.total_score}/30` : a.scoring_status === "pending" ? "…" : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus.mutate({ id: a.id, s: e.target.value as "new" | "shortlisted" | "rejected" | "hired" })}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-bold cursor-pointer outline-none",
                          STATUS_STYLES[a.status as keyof typeof STATUS_STYLES] ?? "bg-surface-2 text-muted-foreground border-white/10",
                        )}
                      >
                        {["new", "shortlisted", "hired", "rejected"].map(s => (
                          <option key={s} value={s} className="bg-surface-1 text-white">{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>
                        ))}
                      </select>
                      {a.outcome_code && (
                        <div className="mt-1">
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
                            getOutcomeDefinition(a.outcome_code)?.badgeStyle || "bg-surface-2 text-white border-white/10"
                          )}>
                            {getOutcomeDefinition(a.outcome_code)?.shortLabel || a.outcome_code}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border",
                        PIPELINE_STAGES.find((s) => s.key === (a.pipeline_stage || "applied"))?.color || "bg-blue-500/15 text-blue-300 border-blue-500/30"
                      )}>
                        {PIPELINE_STAGES.find((s) => s.key === (a.pipeline_stage || "applied"))?.label || "Applied / New"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {a.interview_date ? (
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-1">
                            <Calendar className="size-3 text-primary shrink-0" />
                            <span className="truncate">{a.interview_date}</span>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400">{a.interview_time || "11:30 AM"}</div>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                            a.interview_attendance === "confirmed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                            a.interview_attendance === "attended" ? "bg-primary/15 text-primary border-primary/30" :
                            a.interview_attendance === "no_show" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                            "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          )}>
                            {a.interview_attendance === "confirmed" ? "Confirmed ✓" :
                             a.interview_attendance === "attended" ? "Attended" :
                             a.interview_attendance === "no_show" ? "No-Show" :
                             "Pending"}
                          </span>
                          {a.wave_tag && (
                            <div className="mt-1">
                              <a
                                href={`/wave/${encodeURIComponent(a.wave_tag)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-violet-300 hover:text-white bg-violet-500/15 hover:bg-violet-500/25 px-1.5 py-0.5 rounded border border-violet-500/30 transition-colors"
                                title="Open Client HR Wave Portal"
                              >
                                🏷️ {a.wave_tag} <ArrowUpRight className="size-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          to="/admin/interviews"
                          className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                        >
                          + Schedule
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {a.cv_path && (
                          <span title="CV on file" className="grid size-6 place-items-center rounded-lg bg-surface-2 border border-white/10 text-primary">
                            <FileText className="size-3.5" />
                          </span>
                        )}
                        {a.voice_notes?.length > 0 && (
                          <span title={`${a.voice_notes.length} voice note(s)`} className="grid size-6 place-items-center rounded-lg bg-surface-2 border border-white/10 text-violet-400">
                            <Mic className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={waLink(a.phone, a.full_name, a.offer?.title ?? "the role")}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp"
                          className="grid size-7 place-items-center rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors cursor-pointer"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                        <a
                          href={emailLink(a.email, a.full_name, a.offer?.title ?? "the role")}
                          title="Email"
                          className="grid size-7 place-items-center rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Mail className="size-3.5" />
                        </a>
                        <a
                          href={`tel:${a.phone}`}
                          title="Call"
                          className="grid size-7 place-items-center rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        >
                          <Phone className="size-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {new Date(a.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <Link
                          to="/admin/applicants/$id"
                          params={{ id: a.id }}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                        >
                          Open <ChevronRight className="size-3" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(a.id)}
                          title="Delete applicant"
                          className="grid size-7 place-items-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
