import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Bus,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageCircle,
  Copy,
  Building2,
  ArrowRight,
  Phone,
  ShieldCheck,
  Award,
} from "lucide-react";
import { trackApplicationByPhone } from "@/lib/applications.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Application & Assessment Gate Pass — QuickHire" },
      {
        name: "description",
        content:
          "Check your live recruitment pipeline status, interview gate pass, shuttle bus timing, and offer updates.",
      },
    ],
  }),
  component: TrackApplicationPage,
});

// Full 5 candidate milestone progression derived from the 10 stages
const CANDIDATE_MILESTONES = [
  {
    key: "applied",
    label: "Application Received",
    desc: "CV & voice note scored by AI engine",
    activeStages: ["applied"],
  },
  {
    key: "assessment",
    label: "Assessment & Scoring",
    desc: "Language fluency benchmark validated",
    activeStages: ["test_invited", "test_completed"],
  },
  {
    key: "interview",
    label: "Wave Interview",
    desc: "Assessment center gate pass activated",
    activeStages: ["interview_scheduled", "interview_done"],
  },
  {
    key: "offer",
    label: "Offer Extended",
    desc: "Compensation & company contract issued",
    activeStages: ["offer_pending", "offer_extended"],
  },
  {
    key: "placed",
    label: "Offer Accepted",
    desc: "Onboarding cohort confirmed",
    activeStages: ["accepted"],
  },
] as const;

function getMilestoneIndex(stage: string | null | undefined, hasInterview: boolean, status: string): number {
  const s = stage || (status === "hired" ? "accepted" : hasInterview ? "interview_scheduled" : "applied");
  if (s === "accepted") return 4;
  if (s === "offer_extended" || s === "offer_pending") return 3;
  if (s === "interview_done" || s === "interview_scheduled" || hasInterview) return 2;
  if (s === "test_completed" || s === "test_invited") return 1;
  return 0;
}

const STAGE_FRIENDLY_LABELS: Record<string, { label: string; badgeCls: string; description: string }> = {
  applied: {
    label: "Under AI Review",
    badgeCls: "bg-surface-3 text-zinc-200 border-white/10",
    description: "Your application and voice recording are being evaluated by our assessment engine.",
  },
  test_invited: {
    label: "Assessment Invited",
    badgeCls: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    description: "You have been invited for a language verification test. Check your WhatsApp for direct links.",
  },
  test_completed: {
    label: "Assessment Complete",
    badgeCls: "bg-primary/10 text-primary border-primary/30",
    description: "Your scores have qualified you for upcoming interview cohort waves.",
  },
  interview_scheduled: {
    label: "Interview Wave Confirmed",
    badgeCls: "bg-primary/20 text-primary border-primary/40 shadow-[0_0_12px_rgba(182,255,46,0.2)]",
    description: "Your on-site interview slot is reserved. Your gate pass details and shuttle point are provided below.",
  },
  interview_done: {
    label: "Interview Under Client Review",
    badgeCls: "bg-surface-3 text-zinc-100 border-white/20",
    description: "Hiring managers are finalizing on-site feedback and roleplay scoring.",
  },
  offer_pending: {
    label: "Offer in Preparation",
    badgeCls: "bg-amber-400/15 text-amber-300 border-amber-400/40",
    description: "You have been selected! Formal compensation packages are being drafted.",
  },
  offer_extended: {
    label: "Official Offer Extended",
    badgeCls: "bg-primary text-primary-foreground font-bold border-transparent shadow-[0_0_15px_rgba(182,255,46,0.35)]",
    description: "Congratulations! Your offer is extended. Review salary package details on WhatsApp/Email.",
  },
  accepted: {
    label: "Offer Accepted & Cohort Set",
    badgeCls: "bg-primary text-primary-foreground font-bold border-transparent shadow-[0_0_15px_rgba(182,255,46,0.35)]",
    description: "Welcome to the team! Onboarding logistics and start date orientation are being prepared.",
  },
  rejected: {
    label: "Archived to Smart Pool",
    badgeCls: "bg-white/5 text-zinc-400 border-white/10",
    description: "We are keeping your profile active in our Smart Pool for other matching corporate accounts.",
  },
  withdrawn: {
    label: "Withdrawn",
    badgeCls: "bg-white/5 text-zinc-400 border-white/10",
    description: "Application withdrawn per candidate preference.",
  },
};

function TrackApplicationPage() {
  const [queryInput, setQueryInput] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("phone") || p.get("q") || "";
    }
    return "";
  });
  const [submittedQuery, setSubmittedQuery] = useState(queryInput);

  const tracker = useQuery({
    queryKey: ["track-application", submittedQuery],
    queryFn: () => trackApplicationByPhone({ data: { query: submittedQuery } }),
    enabled: submittedQuery.trim().length >= 4,
  });

  const applications = tracker.data?.applications ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (queryInput.trim().length < 4) {
      toast.error("Please enter a valid phone number or email.");
      return;
    }
    setSubmittedQuery(queryInput.trim());
  }

  return (
    <div className="min-h-[85vh] bg-background text-foreground py-16 md:py-24 px-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-4 py-1.5 text-xs font-semibold text-zinc-300">
            <Sparkles className="size-3.5 text-primary" />
            <span>Candidate Self-Service Status</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
            Track Your Recruitment Status &amp; Gate Pass
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            Check your live candidate pipeline stage, assessment gate pass, shuttle pick-up point, and offer milestones.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
            <div className="relative flex-1 w-full">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Enter mobile number (e.g. 01012345678)"
                className="w-full rounded-xl border border-white/10 bg-surface-1 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_15px_rgba(182,255,46,0.2)] transition-all shadow-xl"
              />
            </div>
            <button
              type="submit"
              disabled={tracker.isFetching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              <Search className="size-4" />
              <span>{tracker.isFetching ? "Checking…" : "Track Status"}</span>
            </button>
          </form>
        </div>

        {/* Results Section */}
        {submittedQuery.trim().length >= 4 && (
          <div className="space-y-8">
            {tracker.isLoading ? (
              <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-16 text-center shadow-xl">
                <div className="size-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">Checking live recruitment records…</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-12 text-center shadow-xl space-y-4">
                <div className="size-12 mx-auto rounded-full bg-amber-500/10 text-amber-300 flex items-center justify-center">
                  <AlertCircle className="size-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">No Application Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  We could not find an active submission registered with <b>{submittedQuery}</b>. Please verify the phone number or explore new openings.
                </p>
                <div className="pt-2">
                  <Link
                    to="/offers"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.25)] hover:shadow-[0_0_18px_rgba(182,255,46,0.5)]"
                  >
                    <span>Browse Open Positions</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              applications.map((app) => {
                const hasInterview = !!app.interview_date;
                const currentStageKey = app.pipeline_stage || "applied";
                const stageMeta = STAGE_FRIENDLY_LABELS[currentStageKey] || STAGE_FRIENDLY_LABELS.applied;
                const activeMilestoneIndex = getMilestoneIndex(app.pipeline_stage, hasInterview, app.status);

                return (
                  <div key={app.id} className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl overflow-hidden">
                    {/* Header Banner */}
                    <div className="border-b border-white/[0.08] bg-surface-2 p-7">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <Building2 className="size-4" /> {app.offer?.company || "Hiring Partner"}
                          </div>
                          <h2 className="font-display text-2xl font-bold text-white">
                            {app.offer?.title || "Customer Service & Sales"}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Applied:{" "}
                              {new Date(app.created_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-zinc-400">ID: {app.id}</span>
                          </div>
                        </div>

                        <div>
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold border", stageMeta.badgeCls)}>
                            <CheckCircle2 className="size-3.5" />
                            {stageMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-7 space-y-8">
                      {/* Active Status Explanation Box */}
                      <div className="rounded-2xl border border-white/10 bg-surface-2 p-5 space-y-1.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-primary">
                          Stage Update
                        </div>
                        <p className="text-sm leading-relaxed text-[#E4E4E7]/90 font-normal">
                          {stageMeta.description}
                        </p>
                      </div>

                      {/* 5 Milestone Funnel Stepper */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Recruitment Progress
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {CANDIDATE_MILESTONES.map((m, idx) => {
                            const isDone = idx <= activeMilestoneIndex;
                            const isCurrent = idx === activeMilestoneIndex;

                            return (
                              <div
                                key={m.key}
                                className={cn(
                                  "rounded-xl border p-3.5 transition-all",
                                  isCurrent
                                    ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(182,255,46,0.15)] ring-1 ring-primary/30"
                                    : isDone
                                    ? "border-white/20 bg-surface-2"
                                    : "border-white/5 bg-surface-1/50 opacity-40"
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div
                                    className={cn(
                                      "size-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                      isDone ? "bg-primary text-black font-extrabold" : "bg-white/10 text-zinc-400"
                                    )}
                                  >
                                    {isDone ? "✓" : idx + 1}
                                  </div>
                                  <span className="text-xs font-bold text-white truncate">{m.label}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground leading-tight">{m.desc}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* GATE PASS CARD (if wave scheduled) */}
                      {hasInterview && (
                        <div className="rounded-2xl border border-primary/30 bg-surface-2 p-6 shadow-xl space-y-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-[0_0_10px_rgba(182,255,46,0.2)]">
                              <ShieldCheck className="size-4" /> Assessment Center Gate Pass
                            </div>
                            <span
                              className={cn(
                                "text-[11px] font-bold px-3 py-1 rounded-full border",
                                app.interview_attendance === "confirmed"
                                  ? "bg-primary/15 text-primary border-primary/30"
                                  : "bg-amber-400/15 text-amber-300 border-amber-400/30"
                              )}
                            >
                              {app.interview_attendance === "confirmed" ? "Arrival Confirmed ✓" : "Pending Arrival"}
                            </span>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-surface-1 p-4 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                <Calendar className="size-4 text-primary" /> Interview Schedule
                              </div>
                              <div className="text-base font-bold text-white">{app.interview_date}</div>
                              <div className="text-xs text-primary font-mono flex items-center gap-1">
                                <Clock className="size-3" /> Slot: {app.interview_time || "11:30 AM"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-surface-1 p-4 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                <MapPin className="size-4 text-primary" /> Assessment Location
                              </div>
                              <div className="text-sm font-bold text-white">{app.interview_site || "Concentrix Smart Village"}</div>
                              <div className="text-xs text-muted-foreground truncate">{app.interview_address || "Smart Village B12"}</div>
                            </div>
                          </div>

                          {app.interview_bus_point && (
                            <div className="rounded-xl border border-white/10 bg-surface-1 p-4 flex items-center gap-3.5">
                              <div className="size-9 rounded-lg bg-surface-3 text-primary flex items-center justify-center shrink-0">
                                <Bus className="size-4" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground block">Shuttle Bus Station</span>
                                <span className="text-xs text-white font-bold">
                                  {app.interview_bus_point} · Departure: {app.interview_bus_time || "09:30 AM"}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 pt-2">
                            {app.interview_maps_link && (
                              <a
                                href={app.interview_maps_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_18px_rgba(182,255,46,0.55)] hover:bg-[#c2ff47] transition-all"
                              >
                                <Navigation className="size-3.5" /> Open Google Maps Direction
                              </a>
                            )}
                            <a
                              href={`https://wa.me/201029324783?text=${encodeURIComponent(
                                `Hi QuickHire, I'm ${app.full_name} regarding my interview on ${app.interview_date} for ${app.offer?.title || "role"}. I have a question about my gate pass.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-1 px-5 py-2.5 text-xs font-bold text-white hover:bg-surface-3 transition-colors"
                            >
                              <MessageCircle className="size-3.5 text-primary" /> WhatsApp Coordinator
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
