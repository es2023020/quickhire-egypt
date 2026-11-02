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
      { title: "Pipeline — QuickHire Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pipeline,
});

// Grouped 10-stage operational buckets for BPO recruitment
const PIPELINE_GROUPS = [
  {
    groupId: "inbound",
    title: "1. Sourcing & Screening",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    stages: ["applied"],
  },
  {
    groupId: "assessments",
    title: "2. Tests & Evaluations",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    stages: ["test_invited", "test_completed"],
  },
  {
    groupId: "interviews",
    title: "3. On-Site Client Waves",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-200",
    stages: ["interview_scheduled", "interview_done"],
  },
  {
    groupId: "offers",
    title: "4. Offers & Placements",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    stages: ["offer_pending", "offer_extended", "accepted"],
  },
  {
    groupId: "archived",
    title: "5. Archived / Withdrawn",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    stages: ["rejected", "withdrawn"],
  },
] as const;

function Pipeline() {
  const qc = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grouped" | "all_10">("grouped");
  const [stageFilter, setStageFilter] = useState<string>("all");

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
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const allApps = apps.data ?? [];

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("applicationId", id);
  }

  function onDrop(e: React.DragEvent, targetStage: string) {
    const id = e.dataTransfer.getData("applicationId");
    if (id) updateStage.mutate({ id, stage: targetStage });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100">
                <Trash2 className="size-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-ink">Delete Applicant?</div>
                <div className="text-xs text-muted-foreground">This action cannot be undone.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Permanently delete this applicant and all associated data.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteApp.mutate(deleteConfirmId)}
                disabled={deleteApp.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteApp.isPending && <Loader2 className="size-4 animate-spin" />}
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sand transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink md:text-3xl flex items-center gap-2.5">
            <KanbanSquare className="size-7 text-primary" /> 10-Stage Recruitment Pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            BPO recruitment workflow across sourcing, evaluations, client wave interviews, and offers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-border bg-sand/60 p-1">
            <button
              onClick={() => setViewMode("grouped")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "grouped" ? "bg-white text-ink shadow-xs" : "text-muted-foreground hover:text-ink"
              )}
            >
              5 Funnel Phases
            </button>
            <button
              onClick={() => setViewMode("all_10")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "all_10" ? "bg-white text-ink shadow-xs" : "text-muted-foreground hover:text-ink"
              )}
            >
              All 10 Stages
            </button>
          </div>

          <Link
            to="/admin/applicants"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-ink bg-white hover:bg-sand transition-colors shadow-2xs"
          >
            Table View
          </Link>
        </div>
      </div>

      {apps.isLoading ? (
        <div className="flex items-center justify-center h-64 rounded-2xl bg-white border border-border">
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
                className="flex flex-col rounded-2xl border border-border/80 bg-sand/30 p-3 min-h-[550px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, group.stages[0])}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", group.badgeColor)}>
                    {group.title}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border shadow-2xs">
                    {groupApps.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[72vh] pr-1">
                  {groupApps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground/60 bg-white/40">
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
          <div className="flex gap-3.5 min-w-[2400px]">
            {PIPELINE_STAGES.map((st) => {
              const stageApps = allApps.filter(
                (a) => (a.pipeline_stage || "applied") === st.key
              );

              return (
                <div
                  key={st.key}
                  className="flex flex-col rounded-2xl border border-border/80 bg-sand/30 p-3 w-64 shrink-0 min-h-[550px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, st.key)}
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold border truncate", st.color)}>
                      {st.label}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground bg-white px-1.5 py-0.5 rounded-full border border-border shadow-2xs">
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[72vh]">
                    {stageApps.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground/60 bg-white/40">
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
      className="cursor-grab rounded-xl border border-border/80 bg-white p-3 shadow-2xs hover:shadow-soft hover:border-primary/40 transition-all active:cursor-grabbing group relative space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to="/admin/applicants/$id"
            params={{ id: app.id }}
            className="font-bold text-ink text-xs hover:text-primary transition-colors truncate block"
          >
            {app.full_name}
          </Link>
          <div className="text-[11px] text-muted-foreground truncate">{app.offer?.title ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{app.offer?.company}</div>
        </div>

        {app.total_score != null && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold font-mono",
              app.total_score >= 25
                ? "bg-emerald-100 text-emerald-800"
                : app.total_score >= 20
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
            )}
          >
            {app.total_score}/30
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-bold border", currentStage?.color || "bg-sand text-ink")}>
          {currentStage?.label || "Applied"}
        </span>

        {app.wave_tag && (
          <a
            href={`/wave/${encodeURIComponent(app.wave_tag)}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 rounded bg-sand px-1.5 py-0.2 text-[9px] font-mono font-semibold text-violet-700 border border-violet-200 hover:bg-violet-50 transition-colors"
          >
            🏷️ {app.wave_tag}
          </a>
        )}
      </div>

      {/* Quick Move Stage Dropdown */}
      <div className="pt-1.5 border-t border-border/50 flex items-center justify-between gap-1">
        <select
          value={app.pipeline_stage || "applied"}
          onChange={(e) => onStageChange(e.target.value)}
          className="rounded border border-border bg-sand/40 px-1.5 py-0.5 text-[10px] font-semibold text-ink outline-none cursor-pointer max-w-[130px] truncate"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <a
            href={`https://wa.me/${cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="grid size-5 place-items-center rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
            title="WhatsApp Candidate"
          >
            <MessageCircle className="size-2.5" />
          </a>

          <Link
            to="/admin/applicants/$id"
            params={{ id: app.id }}
            className="grid size-5 place-items-center rounded border border-border text-muted-foreground hover:text-ink transition-colors"
          >
            <ChevronRight className="size-2.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
