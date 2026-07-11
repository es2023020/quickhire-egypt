import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Phone, ChevronRight, KanbanSquare, Trash2, Mic, FileText } from "lucide-react";
import { toast } from "sonner";
import { adminListApplications, adminUpdateApplicationStatus, adminDeleteApplication, normalizePhone } from "@/lib/applications.functions";
import type { AdminApplicationRow } from "@/lib/applications.functions";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Talent Bridge Egypt Admin" }, { name: "robots", content: "noindex" }] }),
  component: Pipeline,
});

const COLUMNS = [
  { key: "new", label: "New Applications", color: "border-blue-300 bg-blue-50/55", headerColor: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  { key: "shortlisted", label: "Shortlisted", color: "border-amber-300 bg-amber-50/55", headerColor: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  { key: "hired", label: "Hired", color: "border-emerald-300 bg-emerald-50/55", headerColor: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  { key: "rejected", label: "Rejected", color: "border-red-200 bg-red-50/55", headerColor: "bg-red-100 text-red-600", dot: "bg-red-400" },
] as const;

type Status = typeof COLUMNS[number]["key"];

function Pipeline() {
  const qc = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const apps = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => adminListApplications({ data: {} }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: Status }) =>
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
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const allApps = apps.data ?? [];

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("applicationId", id);
  }

  function onDrop(e: React.DragEvent, status: Status) {
    const id = e.dataTransfer.getData("applicationId");
    if (id) updateStatus.mutate({ id, s: status });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
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

      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
          <KanbanSquare className="size-7 text-primary" /> Recruitment Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and drop candidates between stages. {allApps.length} total candidates.
        </p>
      </div>

      {apps.isLoading ? (
        <div className="flex items-center justify-center h-60"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const colApps = allApps.filter(a => a.status === col.key);
            return (
              <div
                key={col.key}
                className={cn("rounded-2xl border-2 p-3 min-h-[500px] transition-colors", col.color)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <div className={cn("mb-3 flex items-center justify-between rounded-xl px-3 py-2", col.headerColor)}>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">{colApps.length}</span>
                </div>

                <div className="space-y-2">
                  {colApps.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-current/20 p-6 text-center text-xs text-muted-foreground opacity-60">
                      Drop candidates here
                    </div>
                  ) : colApps.map(a => (
                    <CandidateCard
                      key={a.id}
                      app={a}
                      onDragStart={onDragStart}
                      onMove={(s) => updateStatus.mutate({ id: a.id, s })}
                      onDelete={() => setDeleteConfirmId(a.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  app,
  onDragStart,
  onMove,
  onDelete,
}: {
  app: AdminApplicationRow;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onMove: (s: Status) => void;
  onDelete: () => void;
}) {
  const normPhone = normalizePhone(app.phone);
  const cleanPhone = normPhone.replace(/[^0-9]/g, "");
  const waMsg = `Hi ${app.full_name}, this is Talent Bridge Egypt regarding your ${app.offer?.title ?? "role"} application. Are you available for a call?`;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, app.id)}
      className="cursor-grab rounded-xl border border-border bg-card p-3.5 shadow-soft hover:shadow-lift transition-all active:cursor-grabbing group relative"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="size-8 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {app.full_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{app.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">{app.offer?.title ?? "—"}</div>
        </div>
        {app.total_score != null && (
          <span className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold",
            app.total_score >= 25 ? "bg-emerald-100 text-emerald-700" :
            app.total_score >= 20 ? "bg-blue-100 text-blue-700" :
            app.total_score >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
          )}>
            {app.total_score}/30
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="flex gap-1">
          {app.cv_path && (
            <span title="CV on file" className="grid size-5 place-items-center rounded bg-primary/10 text-primary">
              <FileText className="size-3" />
            </span>
          )}
          {app.voice_notes?.length > 0 && (
            <span title={`${app.voice_notes.length} voice note(s)`} className="grid size-5 place-items-center rounded bg-violet-100 text-violet-600">
              <Mic className="size-3" />
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{normPhone}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <a
          href={`https://wa.me/${cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(waMsg)}`}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="size-3" />
        </a>
        <a
          href={`tel:${normPhone}`}
          onClick={e => e.stopPropagation()}
          className="grid size-6 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Call"
        >
          <Phone className="size-3" />
        </a>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="grid size-6 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Delete applicant"
        >
          <Trash2 className="size-3" />
        </button>

        <Link
          to="/admin/applicants/$id"
          params={{ id: app.id }}
          className="ml-auto grid size-6 place-items-center rounded-lg bg-sand text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          title="Open profile"
        >
          <ChevronRight className="size-3" />
        </Link>
      </div>

      {/* Move to */}
      <div className="mt-2 pt-2 border-t border-border/40 flex gap-1 flex-wrap">
        {(["new", "shortlisted", "hired", "rejected"] as Status[])
          .filter(s => s !== app.status)
          .map(s => (
            <button
              key={s}
              onClick={() => onMove(s)}
              className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-sand hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
            >
              → {s}
            </button>
          ))}
      </div>
    </div>
  );
}
