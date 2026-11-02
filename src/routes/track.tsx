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
import { buildCandidateReferralShareMessage, buildCandidateShareUrl, LANGUAGE_BOUNTIES } from "@/lib/referral-engine";
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
    desc: "Profile & voice recording scored by AI engine",
    activeStages: ["applied"],
  },
  {
    key: "assessment",
    label: "Assessment & Testing",
    desc: "Language fluency & behavioral benchmarks",
    activeStages: ["test_invited", "test_completed"],
  },
  {
    key: "interview",
    label: "Wave Interview",
    desc: "On-site assessment center gate pass active",
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
    desc: "Welcome to your new career cohort!",
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
    label: "Application Under Review",
    badgeCls: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Your application is currently being evaluated by our team against active corporate requirements.",
  },
  test_invited: {
    label: "Assessment Invited",
    badgeCls: "bg-amber-100 text-amber-800 border-amber-200",
    description: "You have been invited to complete a language or skills assessment test. Check your WhatsApp for links.",
  },
  test_completed: {
    label: "Assessment Scored",
    badgeCls: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Your test results are in and are being finalized for interview wave matching.",
  },
  interview_scheduled: {
    label: "Interview Wave Confirmed",
    badgeCls: "bg-violet-100 text-violet-800 border-violet-200",
    description: "Your on-site interview is scheduled. Your gate pass details and shuttle point are provided below.",
  },
  interview_done: {
    label: "Interview Complete / Under Scoring",
    badgeCls: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Client hiring managers are reviewing your on-site roleplay and language assessment.",
  },
  offer_pending: {
    label: "Offer in Final Approval",
    badgeCls: "bg-yellow-100 text-yellow-900 border-yellow-300",
    description: "The hiring team has selected you! Internal compensation approvals are finalizing.",
  },
  offer_extended: {
    label: "Official Offer Extended",
    badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Congratulations! Your formal offer has been sent. Check your WhatsApp/Email to review details.",
  },
  accepted: {
    label: "Offer Accepted & Cohort Confirmed",
    badgeCls: "bg-green-100 text-green-900 border-green-300",
    description: "Welcome to the team! Onboarding logistics and start date orientation are being prepared.",
  },
  rejected: {
    label: "Application Archived",
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300",
    description: "We are keeping your profile active in our Smart Pool for matching corporate openings that fit your profile.",
  },
  withdrawn: {
    label: "Withdrawn",
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300",
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
    <div className="min-h-[85vh] bg-sand/30 py-8 md:py-14 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles className="size-3.5" /> Self-Service Candidate Portal
          </div>
          <h1 className="font-display text-3xl font-bold text-ink md:text-4xl tracking-tight">
            Track Your Recruitment Status &amp; Gate Pass
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Check your live candidate pipeline stage, interview location, shuttle bus schedules, and offer updates.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto">
            <div className="relative flex-1 w-full">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Enter mobile number (e.g. 01012345678)"
                className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary shadow-soft"
              />
            </div>
            <button
              type="submit"
              disabled={tracker.isFetching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lift hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <Search className="size-4" />
              {tracker.isFetching ? "Checking…" : "Track Status"}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {submittedQuery.trim().length >= 4 && (
          <div className="space-y-6">
            {tracker.isLoading ? (
              <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-soft">
                <div className="size-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">Checking application records…</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-10 text-center shadow-soft">
                <div className="size-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <AlertCircle className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink">No Application Found</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  We couldn't find an application registered with <b>{submittedQuery}</b>. Please check your phone number or submit an application.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    to="/offers"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-soft"
                  >
                    Browse Open Jobs <ArrowRight className="size-3.5" />
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
                  <div key={app.id} className="rounded-3xl border border-border/80 bg-white shadow-soft overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-ink/95 via-ink to-ink/90 text-white p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1">
                            <Building2 className="size-3.5 text-primary" /> {app.offer?.company || "BPO Partner"}
                          </div>
                          <h2 className="font-display text-2xl font-bold tracking-tight">
                            {app.offer?.title || "Customer Service & Sales"}
                          </h2>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/80">
                            <span>
                              Applied:{" "}
                              {new Date(app.created_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-white/60">ID: {app.id}</span>
                          </div>
                        </div>

                        <div>
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border", stageMeta.badgeCls)}>
                            <CheckCircle2 className="size-3.5" />
                            {stageMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Active Status Explanation Box */}
                      <div className="rounded-2xl border border-border/80 bg-sand/30 p-4 space-y-1">
                        <div className="text-xs font-bold text-ink uppercase tracking-wider">
                          Current Stage Status
                        </div>
                        <p className="text-sm text-ink/90">
                          {stageMeta.description}
                        </p>
                      </div>

                      {/* 5 Milestone Funnel Stepper */}
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Hiring Process Progress
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {CANDIDATE_MILESTONES.map((m, idx) => {
                            const isDone = idx <= activeMilestoneIndex;
                            const isCurrent = idx === activeMilestoneIndex;

                            return (
                              <div
                                key={m.key}
                                className={cn(
                                  "rounded-2xl border p-3 transition-all",
                                  isCurrent
                                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                                    : isDone
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : "border-border/60 bg-sand/20 opacity-50"
                                )}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div
                                    className={cn(
                                      "size-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                      isDone ? "bg-emerald-600 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                                    )}
                                  >
                                    {isDone ? "✓" : idx + 1}
                                  </div>
                                  <span className="text-xs font-bold text-ink truncate">{m.label}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground leading-tight">{m.desc}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* GATE PASS CARD (if wave scheduled) */}
                      {hasInterview && (
                        <div className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/60 p-5 shadow-xs">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white shadow-soft">
                              <ShieldCheck className="size-3.5" /> Official Assessment Center Gate Pass
                            </div>
                            <span
                              className={cn(
                                "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                                app.interview_attendance === "confirmed"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              )}
                            >
                              {app.interview_attendance === "confirmed" ? "Attendance Confirmed ✓" : "Pending Arrival"}
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 mb-4">
                            <div className="rounded-xl border border-violet-100 bg-white p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                                <Calendar className="size-3.5 text-violet-600" /> Assessment Date &amp; Time
                              </div>
                              <div className="text-base font-bold text-ink">{app.interview_date}</div>
                              <div className="text-xs font-mono text-violet-700 flex items-center gap-1">
                                <Clock className="size-3" /> Slot: {app.interview_time || "11:30 AM"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-violet-100 bg-white p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                                <MapPin className="size-3.5 text-violet-600" /> Assessment Center / Hub
                              </div>
                              <div className="text-sm font-bold text-ink">{app.interview_site || "Concentrix Smart Village"}</div>
                              <div className="text-xs text-muted-foreground truncate">{app.interview_address || "Smart Village B12"}</div>
                            </div>
                          </div>

                          {app.interview_bus_point && (
                            <div className="rounded-xl border border-violet-100 bg-white p-3 mb-3 flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                                <Bus className="size-4" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-ink block">Shuttle Bus Pickup Point</span>
                                <span className="text-xs text-violet-800 font-bold">
                                  {app.interview_bus_point} · {app.interview_bus_time || "09:30 AM"}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {app.interview_maps_link && (
                              <a
                                href={app.interview_maps_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
                              >
                                <Navigation className="size-3.5" /> Open Google Maps Direction
                              </a>
                            )}
                            <a
                              href={`https://wa.me/201012345678?text=${encodeURIComponent(
                                `Hi QuickHire, I'm ${app.full_name} regarding my interview on ${app.interview_date} for ${app.offer?.title || "role"}. I have a question about my gate pass.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-sand transition-colors"
                            >
                              <MessageCircle className="size-3.5 text-emerald-600" /> WhatsApp Coordinator
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
