import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MessageCircle,
  ChevronRight,
  KanbanSquare,
  Trash2,
  Mic,
  FileText,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminListApplications,
  adminUpdateApplicationStatus,
  adminUpdatePipelineStage,
  adminDeleteApplication,
  normalizePhone,
} from "@/lib/applications.functions";
import type { AdminApplicationRow } from "@/lib/applications.functions";
import { PIPELINE_STAGES } from "./applicants.index";
import { getOutcomeDefinition } from "@/lib/outcome-codes";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/pipeline")({
  head: () => ({
    meta: [
      { title: "Recruitment Pipeline — QuickHire Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PipelinePage,
});

// Grouped 10-stage operational buckets for BPO recruitment
const PIPELINE_GROUPS = [
  {
    groupId: "inbound",
    title: "1. Sourcing & Screening",
    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    stages: ["applied"],
  },
  {
    groupId: "assessments",
    title: "2. Tests & Evaluations",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    stages: ["test_invited", "test_completed"],
  },
  {
    groupId: "interviews",
    title: "3. On-Site Client Waves",
    badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    stages: ["interview_scheduled", "interview_done"],
  },
  {
    groupId: "offers",
    title: "4. Offers & Placements",
    badgeColor: "bg-primary/15 text-primary border-primary/30",
    stages: ["offer_pending", "offer_extended", "accepted"],
  },
  {
    groupId: "archived",
    title: "5. Archived / Withdrawn",
    badgeColor: "bg-white/10 text-zinc-400 border-white/15",
    stages: ["rejected", "withdrawn"],
  },
] as const;

function PipelinePage() {
  const qc = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grouped" | "all_10">("grouped");

  const apps = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => adminListApplications({ data: {} }),
  });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      adminUpdatePipelineStage({
        data: {
          id,
          stage,
          changed_by: "QuickHire Admin (Kanban)",
          role: "admin",
          comment: `Moved to ${PIPELINE_STAGES.find((s) => s.key === stage)?.label || stage}`,
        },
      }),
    onSuccess: () => {
      toast.success("Pipeline stage updated");
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update stage"),
  });

  const deleteApp = useMutation({
    mutationFn: (id: string) => adminDeleteApplication({ data: { id } }),
    onSuccess: () => {
      toast.success("Applicant deleted");
      setDeleteConfirmId(null);
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const allApps = apps.data ?? [];

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("applicationId", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, targetStage: string) {
    const id = e.dataTransfer.getData("applicationId");
    if (id) updateStage.mutate({ id, stage: targetStage });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1680px] mx-auto bg-background text-foreground space-y-6">
      {/* Delete confirmation modal */}
      {deleteConfirmId && (
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
              Permanently remove this candidate record and associated evaluation notes from the database.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteApp.mutate(deleteConfirmId)}
                disabled={deleteApp.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {deleteApp.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Delete Record
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono mb-2">
            <KanbanSquare className="size-3.5" /> RECRUITMENT WORKFLOW
          </div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl flex items-center gap-2.5">
            10-Stage Pipeline Kanban
          </h1>
          <p className="mt-1 text-sm text-[#E4E4E7]/80">
            Drag candidates across sourcing, assessments, client wave interviews, and offers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-white/10 bg-surface-1 p-1">
            <button
              onClick={() => setViewMode("grouped")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "grouped"
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.3)]"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              5 Funnel Phases
            </button>
            <button
              onClick={() => setViewMode("all_10")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "all_10"
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.3)]"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              All 10 Stages
            </button>
          </div>

          <Link
            to="/admin/applicants"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-surface-1 hover:text-white hover:bg-surface-2 transition-colors shadow-sm"
          >
            Table View →
          </Link>
        </div>
      </div>

      {apps.isLoading ? (
        <div className="flex items-center justify-center h-64 rounded-3xl bg-surface-1 border border-white/10">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : viewMode === "grouped" ? (
        /* Grouped 5 Phase Kanban */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {PIPELINE_GROUPS.map((group) => {
            const groupApps = allApps.filter((a) =>
              group.stages.includes((a.pipeline_stage || "applied") as any)
            );

            return (
              <div
                key={group.groupId}
                className="flex flex-col rounded-3xl border border-white/[0.08] bg-surface-1 p-3.5 min-h-[580px] shadow-xl"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, group.stages[0])}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", group.badgeColor)}>
                    {group.title}
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-300 bg-surface-2 px-2 py-0.5 rounded-full border border-white/10">
                    {groupApps.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[72vh] pr-1">
                  {groupApps.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-muted-foreground bg-surface-2/30">
                      Drag candidate here
                    </div>
                  ) : (
                    groupApps.map((a) => (
                      <PipelineCandidateCard
                        key={a.id}
                        app={a}
                        onDragStart={onDragStart}
                        onStageChange={(st) => updateStage.mutate({ id: a.id, stage: st })}
                        onDelete={() => setDeleteConfirmId(a.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full 10 Horizontal Stage Columns */
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[2600px]">
            {PIPELINE_STAGES.map((st) => {
              const stageApps = allApps.filter(
                (a) => (a.pipeline_stage || "applied") === st.key
              );

              return (
                <div
                  key={st.key}
                  className="flex flex-col rounded-3xl border border-white/[0.08] bg-surface-1 p-3.5 w-64 shrink-0 min-h-[580px] shadow-xl"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, st.key)}
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold border truncate", st.color)}>
                      {st.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-zinc-300 bg-surface-2 px-2 py-0.5 rounded-full border border-white/10">
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[72vh]">
                    {stageApps.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground bg-surface-2/30">
                        No candidates
                      </div>
                    ) : (
                      stageApps.map((a) => (
                        <PipelineCandidateCard
                          key={a.id}
                          app={a}
                          onDragStart={onDragStart}
                          onStageChange={(s) => updateStage.mutate({ id: a.id, stage: s })}
                          onDelete={() => setDeleteConfirmId(a.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineCandidateCard({
  app,
  onDragStart,
  onStageChange,
  onDelete,
}: {
  app: AdminApplicationRow;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onStageChange: (stage: string) => void;
  onDelete: () => void;
}) {
  const normPhone = normalizePhone(app.phone);
  const cleanPhone = normPhone.replace(/[^0-9]/g, "");
  const currentStage = PIPELINE_STAGES.find((s) => s.key === (app.pipeline_stage || "applied"));

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, app.id)}
      className="cursor-grab rounded-2xl border border-white/10 bg-surface-2 p-3.5 shadow-lg hover:border-primary/50 hover:shadow-xl transition-all active:cursor-grabbing group relative space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to="/admin/applicants/$id"
            params={{ id: app.id }}
            className="font-bold text-white text-xs hover:text-primary transition-colors truncate block"
          >
            {app.full_name}
          </Link>
          <div className="text-[11px] text-[#E4E4E7]/70 truncate mt-0.5">{app.offer?.title ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{app.offer?.company}</div>
        </div>

        {app.total_score != null && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold font-mono border",
              app.total_score >= 25
                ? "border-primary/40 bg-primary/10 text-primary"
                : app.total_score >= 20
                ? "border-blue-500/30 bg-blue-500/15 text-blue-300"
                : "border-amber-500/30 bg-amber-500/15 text-amber-300"
            )}
          >
            {app.total_score}/30
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", currentStage?.color || "bg-surface-3 text-white")}>
          {currentStage?.label || "Applied"}
        </span>

        {app.wave_tag && (
          <a
            href={`/wave/${encodeURIComponent(app.wave_tag)}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 rounded bg-violet-500/15 px-2 py-0.5 text-[9px] font-mono font-bold text-violet-300 border border-violet-500/30 hover:bg-violet-500/25 transition-colors"
          >
            🏷️ {app.wave_tag}
          </a>
        )}
      </div>

      {/* Quick Move Stage Dropdown & Action Icons */}
      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-1">
        <select
          value={app.pipeline_stage || "applied"}
          onChange={(e) => onStageChange(e.target.value)}
          className="rounded-lg border border-white/10 bg-surface-3 px-2 py-1 text-[10px] font-semibold text-white outline-none cursor-pointer max-w-[130px] truncate"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s.key} value={s.key} className="bg-surface-1">
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <a
            href={`https://wa.me/${cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="grid size-6 place-items-center rounded-lg bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
            title="WhatsApp Candidate"
          >
            <MessageCircle className="size-3" />
          </a>

          <Link
            to="/admin/applicants/$id"
            params={{ id: app.id }}
            className="grid size-6 place-items-center rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-surface-3 transition-colors"
          >
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
