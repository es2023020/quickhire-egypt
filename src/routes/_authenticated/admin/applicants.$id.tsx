import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Loader2, FileText, Phone, Mail, MessageCircle, MapPin,
  Calendar, RefreshCw, User, Briefcase, Clock, ChevronLeft,
  Send, Copy, CheckCheck, Zap, Star, ChevronUp, ChevronDown,
  Mic, Share2, Building2, GraduationCap, BadgeCheck, ExternalLink,
  Edit3, Check, X, Globe, Target, BarChart3, Trash2,
  Play, Pause, Download, Save, AlertTriangle, DollarSign, Printer,
  Bus, Navigation, MapPinned, CheckCircle, Clock3, AlertCircle,
  CalendarCheck, Compass, CheckCircle2, XCircle, Gift,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminGetApplication,
  adminListApplications,
  adminUpdateApplicationStatus,
  adminUpdateApplicant,
  adminRescore,
  adminDeleteApplication,
  adminScheduleInterview,
  adminUpdateInterviewAttendance,
  adminRerouteApplicant,
  adminUpdateOutcome,
  adminUpdatePipelineStage,
} from "@/lib/applications.functions";
import { OUTCOME_CODES, getOutcomeDefinition } from "@/lib/outcome-codes";
import { checkCandidateCooldown } from "@/lib/cooldown-engine";
import { generateCandidateAccessCode } from "@/lib/candidate-access";
import { adminListOffers } from "@/lib/offers.functions";
import {
  calculateSmartPoolMatches,
  buildRerouteWhatsAppInvite,
  type PooledMatch,
} from "@/lib/smart-pooling";
import {
  buildAdminReferralRequestWhatsApp,
  generateCandidateReferralCode,
  LANGUAGE_BOUNTIES,
} from "@/lib/referral-engine";
import {
  BPO_SITE_PRESETS,
  BUS_MEETING_POINTS,
  TIME_SLOTS,
  DRESS_CODES,
  DEFAULT_CHECKLIST,
  buildFormalInterviewWhatsApp,
  build24hReminderWhatsApp,
  build2hFinalCheckinWhatsApp,
  buildLocationPinWhatsApp,
  buildRescheduleWhatsApp,
  type BpoSitePreset,
} from "@/lib/interview-logistics";
import { cn } from "@/lib/utils";
import { getFile } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/applicants/$id")({
  head: () => ({ meta: [{ title: "Applicant — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: ApplicantDetail,
});

const STATUS_CFG = {
  new: { label: "New", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  shortlisted: { label: "Shortlisted", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  hired: { label: "Hired", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600 border-red-200", dot: "bg-red-500" },
} as const;

export const PIPELINE_STAGES = [
  { key: "applied", label: "Applied / New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "interview_scheduled", label: "Interview Scheduled", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "interview_done", label: "Interview Done / Under Evaluation", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { key: "test_invited", label: "Test Sent / Assessment Invited", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "test_completed", label: "Test Completed", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "offer_pending", label: "Offer Pending / Approval", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { key: "offer_extended", label: "Offer Extended", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "accepted", label: "Accepted", color: "bg-green-100 text-green-800 border-green-300" },
  { key: "rejected", label: "Rejected / Archived", color: "bg-red-100 text-red-600 border-red-200" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-slate-100 text-slate-600 border-slate-200" },
] as const;

function scoreGrade(s: number, max: number) {
  const pct = s / max;
  if (pct >= 0.9) return { label: "Excellent", color: "text-emerald-600", bar: "bg-emerald-500" };
  if (pct >= 0.75) return { label: "Good", color: "text-blue-600", bar: "bg-blue-500" };
  if (pct >= 0.6) return { label: "Average", color: "text-amber-600", bar: "bg-amber-400" };
  return { label: "Below avg", color: "text-red-500", bar: "bg-red-400" };
}

function totalGrade(s: number) {
  if (s >= 27) return { label: "🎯 Exceptional", color: "from-emerald-500 to-emerald-600", badge: "bg-emerald-100 text-emerald-700" };
  if (s >= 24) return { label: "⭐ Excellent", color: "from-primary to-primary/80", badge: "bg-blue-100 text-blue-700" };
  if (s >= 20) return { label: "👍 Good", color: "from-blue-500 to-blue-600", badge: "bg-sky-100 text-sky-700" };
  if (s >= 15) return { label: "🔍 Average", color: "from-amber-500 to-amber-600", badge: "bg-amber-100 text-amber-700" };
  return { label: "⚠️ Below avg", color: "from-red-500 to-red-600", badge: "bg-red-100 text-red-600" };
}

function buildCompanyShareMessage(app: {
  full_name: string; phone: string; email: string; location: string | null;
  age: number | null; grad_status: string | null; english_level: string | null;
  experience_years: number | null; salary_expectation: string | null;
  english_score: number | null; comm_score: number | null; exp_score: number | null;
  total_score: number | null; ai_notes: string | null;
  status: string; transcripts: Record<string, string>;
  answers: Record<string, string | number | boolean | null>;
  offer: { title: string; company: string } | null;
  cv_path: string | null; voice_notes: { lang: string; path: string }[];
}) {
  const role = app.offer?.title ?? "the role";
  const company = app.offer?.company ?? "your company";
  const grade = app.total_score != null ? totalGrade(app.total_score).label : "";

  const lines = [
    `📋 *Candidate Profile — QuickHire*`,
    ``,
    `👤 *${app.full_name}*`,
    `📱 ${app.phone}  |  📧 ${app.email}`,
    app.location ? `📍 ${app.location}` : null,
    app.age ? `🎂 ${app.age} years old` : null,
    ``,
    `🎯 *Applied for:* ${role} @ ${company}`,
    ``,
    `━━━━━━━━━━━━━━`,
    `📊 *AI ASSESSMENT SCORES*`,
    `━━━━━━━━━━━━━━`,
    `🏆 *Total Score: ${app.total_score ?? "—"}/30* ${grade}`,
    `🗣 English Fluency: ${app.english_score ?? "—"}/10`,
    `💬 Communication: ${app.comm_score ?? "—"}/10`,
    `🏢 Experience: ${app.exp_score ?? "—"}/10`,
    ``,
    `━━━━━━━━━━━━━━`,
    `👤 *CANDIDATE DETAILS*`,
    `━━━━━━━━━━━━━━`,
    app.grad_status ? `• Education: ${app.grad_status}` : null,
    app.english_level ? `• English: ${app.english_level}` : null,
    app.experience_years != null ? `• Experience: ${app.experience_years} year(s)` : null,
    app.salary_expectation ? `• Salary target: ${Number(app.salary_expectation).toLocaleString()} EGP/month` : null,
    ...Object.entries(app.answers ?? {}).filter(([, v]) => v).map(([k, v]) => `• ${k.replace(/_/g, " ")}: ${v}`),
    ``,
  ];

  if (app.ai_notes) {
    lines.push(`━━━━━━━━━━━━━━`, `🤖 *AI ANALYSIS*`, `━━━━━━━━━━━━━━`, `"${app.ai_notes}"`, ``);
  }

  const transcriptEntries = Object.entries(app.transcripts ?? {});
  if (transcriptEntries.length > 0) {
    lines.push(`━━━━━━━━━━━━━━`, `🎙 *VOICE NOTE TRANSCRIPTS*`, `━━━━━━━━━━━━━━`);
    transcriptEntries.forEach(([lang, text]) => {
      lines.push(`[${lang}]: "${text}"`);
    });
    lines.push(``);
  }

  lines.push(
    app.cv_path ? `📎 *CV on file ✓*` : `📎 No CV uploaded`,
    app.voice_notes?.length ? `🎙 *${app.voice_notes.length} Voice note(s) on file ✓*` : `🎙 No voice notes`,
    ``,
    `Powered by *QuickHire* 🇪🇬`,
    `Egypt's Premier Talent & Recruitment Platform`,
  );

  return lines.filter((l) => l !== null).join("\n");
}

function buildCandidateWaMsg(name: string, role: string, company: string) {
  return `Hi ${name}! This is the QuickHire recruitment team. We're reaching out regarding your application for the *${role}* position at *${company}*. Are you available for a quick call today?`;
}

function buildInterviewMsg(name: string, role: string, company: string) {
  return `Hi ${name}! 🎉 Great news — you've been *shortlisted* for the *${role}* role at *${company}*! We'd like to schedule an interview. Please reply with your available time slots this week. Thanks, QuickHire Team 🚀`;
}

function buildOfferMsg(name: string, role: string, company: string) {
  return `Hi ${name}! Congratulations! 🎊 We're delighted to confirm your selection for the *${role}* position at *${company}*. Please reply to confirm your acceptance and we'll share the next steps. Welcome aboard! — QuickHire Team`;
}

function buildRejectionMsg(name: string, role: string) {
  return `Hi ${name}, thank you for applying for the *${role}* role through QuickHire. After careful review, we're unable to move forward with your application at this time. We'll keep your profile for future opportunities. Best of luck! — QuickHire Team`;
}

function waNumber(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits.startsWith("+") ? digits.slice(1) : digits;
}

function ApplicantDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery({
    queryKey: ["admin", "application", id],
    queryFn: () => adminGetApplication({ data: { id } }),
  });

  const offersQuery = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: () => adminListOffers(),
  });

  const allAppsQuery = useQuery({
    queryKey: ["admin", "applications", "all-for-cooldown"],
    queryFn: () => adminListApplications({ data: { offer_id: null, status: null } }),
  });

  const cooldownInfo = useMemo(() => {
    if (!app) return { hasCooldownRisk: false, severity: "clear" as const, reason: null, companyName: "" };
    return checkCandidateCooldown(app, allAppsQuery.data || []);
  }, [app, allAppsQuery.data]);

  const poolMatches = useMemo<PooledMatch[]>(() => {
    if (!app || !offersQuery.data) return [];
    return calculateSmartPoolMatches(
      {
        englishScore: app.english_score,
        englishLevel: app.english_level,
        location: app.location,
        experienceYears: app.experience_years,
        salaryExpectation: app.salary_expectation,
        currentOfferId: app.offer_id,
      },
      offersQuery.data
    ).slice(0, 4);
  }, [app, offersQuery.data]);

  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<"english" | "comm" | "exp" | null>(null);
  const [scoreEdits, setScoreEdits] = useState<{ english: number; comm: number; exp: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<{
    full_name: string; email: string; phone: string;
    age: string; location: string; grad_status: string;
    english_level: string; experience_years: string; salary_expectation: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  // Interview Logistics & Scheduling State (The No-Show Killer)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("smart-village");
  const [interviewDate, setInterviewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [interviewTime, setInterviewTime] = useState<string>("11:30 AM");
  const [busPoint, setBusPoint] = useState<string>(BUS_MEETING_POINTS[0]);
  const [busTime, setBusTime] = useState<string>("10:30 AM");
  const [dressCode, setDressCode] = useState<string>(DRESS_CODES[0]);
  const [coordinatorPhone, setCoordinatorPhone] = useState<string>("+201029324783");
  const [customSiteName, setCustomSiteName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customMapsUrl, setCustomMapsUrl] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [stageComment, setStageComment] = useState("");
  const [selectedPendingStage, setSelectedPendingStage] = useState<string | null>(null);

  const updatePipelineStage = useMutation({
    mutationFn: ({ stage, comment }: { stage: string; comment?: string | null }) =>
      adminUpdatePipelineStage({
        data: {
          id,
          stage,
          changed_by: (typeof window !== "undefined" && localStorage.getItem("qh_admin_email")) || "QuickHire Admin",
          role: "admin",
          comment: comment || null,
        },
      }),
    onSuccess: () => {
      toast.success("Pipeline stage updated");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      setSelectedPendingStage(null);
      setStageComment("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update pipeline stage"),
  });

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function loadCv() {
      if (!app) return;

      // Fallback to cv_data if present
      if (app.cv_data) {
        setCvUrl(app.cv_data);
        return;
      }

      // Try loading from IndexedDB
      try {
        const file = await getFile(`${id}-cv`);
        if (file && active) {
          url = URL.createObjectURL(file);
          setCvUrl(url);
        } else if (active) {
          // Fallback to bundled placeholder CV for demo candidates
          setCvUrl("/placeholder-cv.pdf");
        }
      } catch (e) {
        console.error("Error reading CV from IndexedDB", e);
        if (active) {
          setCvUrl("/placeholder-cv.pdf");
        }
      }
    }

    loadCv();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [app, id]);


  useEffect(() => {
    if (app) {
      setNotes(app.admin_notes ?? "");
      setScoreEdits({
        english: app.english_score ?? 0,
        comm: app.comm_score ?? 0,
        exp: app.exp_score ?? 0,
      });
      setEditFields({
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        age: app.age != null ? String(app.age) : "",
        location: app.location ?? "",
        grad_status: app.grad_status ?? "",
        english_level: app.english_level ?? "",
        experience_years: app.experience_years != null ? String(app.experience_years) : "",
        salary_expectation: app.salary_expectation ?? "",
      });
    }
    if (app?.outcome_code) setSelectedOutcomeCode(app.outcome_code);
    if (app?.outcome_notes) setOutcomeNotesInput(app.outcome_notes);
  }, [app]);

  const update = useMutation({
    mutationFn: (patch: Omit<Parameters<typeof adminUpdateApplicationStatus>[0]["data"], "id">) =>
      adminUpdateApplicationStatus({ data: { id, ...patch } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setEditingScore(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateProfile = useMutation({
    mutationFn: (data: Parameters<typeof adminUpdateApplicant>[0]["data"]) =>
      adminUpdateApplicant({ data }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      setEditMode(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rescore = useMutation({
    mutationFn: () => adminRescore({ data: { id } }),
    onSuccess: () => {
      toast.success("Re-scored by AI");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteApp = useMutation({
    mutationFn: () => adminDeleteApplication({ data: { id } }),
    onSuccess: () => {
      toast.success("Applicant deleted");
      navigate({ to: "/admin/applicants" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const scheduleInterview = useMutation({
    mutationFn: (data: Parameters<typeof adminScheduleInterview>[0]["data"]) =>
      adminScheduleInterview({ data }),
    onSuccess: () => {
      toast.success("Interview scheduled & logistics saved! Ready to send WhatsApp invite.");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      setScheduleModalOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to schedule interview"),
  });

  const updateAttendance = useMutation({
    mutationFn: (attendance: "pending" | "confirmed" | "attended" | "no_show") =>
      adminUpdateInterviewAttendance({ data: { id, attendance } }),
    onSuccess: () => {
      toast.success("Attendance status updated!");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update attendance"),
  });

  const rerouteApplicant = useMutation({
    mutationFn: ({ new_offer_id, reason }: { new_offer_id: string; reason?: string }) =>
      adminRerouteApplicant({ data: { id, new_offer_id, reason } }),
    onSuccess: (_, vars) => {
      const target = offersQuery.data?.find((o) => o.id === vars.new_offer_id);
      toast.success(`Fast-tracked & re-routed to "${target?.title || "new role"}" wave!`);
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to re-route applicant"),
  });

  const updateOutcome = useMutation({
    mutationFn: ({ outcome_code, outcome_notes, status }: { outcome_code: string; outcome_notes?: string; status?: "hired" | "shortlisted" | "rejected" }) =>
      adminUpdateOutcome({ data: { id, outcome_code, outcome_notes, status } }),
    onSuccess: () => {
      toast.success("Assessment outcome saved!");
      qc.invalidateQueries({ queryKey: ["admin", "application", id] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update outcome"),
  });

  const [selectedOutcomeCode, setSelectedOutcomeCode] = useState<string>("");
  const [outcomeNotesInput, setOutcomeNotesInput] = useState<string>("");

  // Sync interview state when applicant record is loaded
  useEffect(() => {
    if (app?.interview_date) setInterviewDate(app.interview_date);
    if (app?.interview_time) setInterviewTime(app.interview_time);
    if (app?.interview_bus_point) setBusPoint(app.interview_bus_point);
    if (app?.interview_bus_time) setBusTime(app.interview_bus_time);
    if (app?.interview_notes) setInterviewNotes(app.interview_notes);
    if (app?.interview_site) {
      const match = BPO_SITE_PRESETS.find((s) => s.name === app.interview_site);
      if (match) {
        setSelectedSiteId(match.id);
      } else {
        setSelectedSiteId("custom");
        setCustomSiteName(app.interview_site);
        setCustomAddress(app.interview_address || "");
        setCustomMapsUrl(app.interview_maps_link || "");
      }
    }
    if (app?.outcome_code) setSelectedOutcomeCode(app.outcome_code);
    if (app?.outcome_notes) setOutcomeNotesInput(app.outcome_notes);
  }, [app]);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
      toast.success("Copied!");
    });
  }

  async function handleCopyCv() {
    try {
      let blob: Blob | null = null;
      if (cvUrl === "/placeholder-cv.pdf") {
        const res = await fetch("/placeholder-cv.pdf");
        blob = await res.blob();
      } else {
        const file = await getFile(`${id}-cv`);
        if (file) blob = file;
      }

      if (blob) {
        const item = new ClipboardItem({ [blob.type || "application/pdf"]: blob });
        await navigator.clipboard.write([item]);
        setCopied("cv-file");
        setTimeout(() => setCopied(null), 2500);
        toast.success("CV copied to clipboard! You can paste (Ctrl+V) directly inside WhatsApp.");
      } else {
        toast.error("Could not find CV file to copy.");
      }
    } catch (err) {
      console.error(err);
      toast.info("Browser security restricts copying document files directly to clipboard. The CV is downloading instead — drag & drop it directly into WhatsApp!");
      
      const link = document.createElement("a");
      link.href = cvUrl || "/placeholder-cv.pdf";
      link.download = app?.cv_path?.split("/").pop() || "cv.pdf";
      link.click();
    }
  }

  function saveScores() {
    if (!scoreEdits) return;
    update.mutate({
      english_score: scoreEdits.english,
      comm_score: scoreEdits.comm,
      exp_score: scoreEdits.exp,
    });
  }

  function saveProfile() {
    if (!editFields) return;
    updateProfile.mutate({
      id,
      full_name: editFields.full_name,
      email: editFields.email,
      phone: editFields.phone,
      age: editFields.age ? Number(editFields.age) : null,
      location: editFields.location || null,
      grad_status: editFields.grad_status || null,
      english_level: editFields.english_level || null,
      experience_years: editFields.experience_years ? Number(editFields.experience_years) : null,
      salary_expectation: editFields.salary_expectation || null,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!app) {
    return <div className="p-10 text-center text-muted-foreground">Application not found.</div>;
  }

  const role = app.offer?.title ?? "—";
  const company = app.offer?.company ?? "—";
  const hrPhone = (app.offer as { hr_phone?: string | null } | null)?.hr_phone ?? null;
  const statusCfg = STATUS_CFG[app.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.new;
  const liveEng = scoreEdits?.english ?? app.english_score ?? 0;
  const liveComm = scoreEdits?.comm ?? app.comm_score ?? 0;
  const liveExp = scoreEdits?.exp ?? app.exp_score ?? 0;
  const liveTotal = liveEng + liveComm + liveExp;
  const totalGradeInfo = totalGrade(liveTotal);
  const shareMsg = buildCompanyShareMessage(app);

  // Compute Active Logistics Information
  const activePreset = BPO_SITE_PRESETS.find((s) => s.id === selectedSiteId);
  const currentSiteName = selectedSiteId === "custom" ? (customSiteName || "Custom Assessment Center") : (activePreset?.name || "Smart Village");
  const currentAddress = selectedSiteId === "custom" ? (customAddress || "Cairo, Egypt") : (activePreset?.address || "");
  const currentMapsUrl = selectedSiteId === "custom" ? (customMapsUrl || "https://maps.google.com") : (activePreset?.mapsUrl || "https://maps.app.goo.gl/KYyUoBtBshB8mnro7");

  const formalInviteWaMsg = buildFormalInterviewWhatsApp({
    candidateName: app.full_name,
    candidatePhone: app.phone,
    roleTitle: role,
    companyName: company,
    interviewDate: app.interview_date || interviewDate,
    interviewTime: app.interview_time || interviewTime,
    siteName: app.interview_site || currentSiteName,
    siteAddress: app.interview_address || currentAddress,
    mapsUrl: app.interview_maps_link || currentMapsUrl,
    busMeetingPoint: app.interview_bus_point || busPoint,
    busDepartureTime: app.interview_bus_time || busTime,
    dressCode: dressCode,
    hrCoordinatorPhone: hrPhone || coordinatorPhone,
  });

  const reminder24hWaMsg = build24hReminderWhatsApp({
    candidateName: app.full_name,
    roleTitle: role,
    interviewDate: app.interview_date || interviewDate,
    interviewTime: app.interview_time || interviewTime,
    siteName: app.interview_site || currentSiteName,
    mapsUrl: app.interview_maps_link || currentMapsUrl,
    busMeetingPoint: app.interview_bus_point || busPoint,
    busDepartureTime: app.interview_bus_time || busTime,
  });

  const checkin2hWaMsg = build2hFinalCheckinWhatsApp({
    candidateName: app.full_name,
    interviewTime: app.interview_time || interviewTime,
    siteName: app.interview_site || currentSiteName,
    mapsUrl: app.interview_maps_link || currentMapsUrl,
    hrCoordinatorPhone: hrPhone || coordinatorPhone,
  });

  const mapsPinWaMsg = buildLocationPinWhatsApp(
    app.interview_site || currentSiteName,
    app.interview_address || currentAddress,
    app.interview_maps_link || currentMapsUrl
  );

  const rescheduleWaMsg = buildRescheduleWhatsApp(app.full_name, role);

  const candidateRefCode = app.referral_code || generateCandidateReferralCode(app.full_name, app.phone);
  const adminReferralWaUrl = buildAdminReferralRequestWhatsApp({
    candidateName: app.full_name,
    phone: app.phone,
    code: candidateRefCode,
    score: liveTotal,
  });
  const referralRequestWaMsg = decodeURIComponent(adminReferralWaUrl.split("text=")[1] || "");

  return (
    <div id="printable-candidate-profile" className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-5 bg-background text-foreground">

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-ink">Delete {app.full_name}?</div>
                <div className="text-xs text-muted-foreground">This cannot be undone.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              All data including scores, voice notes, CV, transcripts and admin notes will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteApp.mutate()}
                disabled={deleteApp.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteApp.isPending && <Loader2 className="size-4 animate-spin" />}
                Delete Permanently
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sand transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule On-Site Interview & Logistics Modal (The No-Show Killer) */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-violet-200 bg-white p-6 shadow-2xl my-8">
            <div className="mb-4 flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                  <CalendarCheck className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">
                    Schedule On-Site Assessment Slot
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Set wave logistics, shuttle bus hubs, and generate gate-pass invitations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-sand"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Date & Quick Shortcuts */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-violet-600" /> Interview Date
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setInterviewDate(d.toISOString().split("T")[0]);
                    }}
                    className="rounded-lg border border-border bg-sand/60 px-2.5 py-1 text-xs font-medium text-ink hover:bg-sand transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setInterviewDate(d.toISOString().split("T")[0]);
                    }}
                    className="rounded-lg border border-border bg-sand/60 px-2.5 py-1 text-xs font-medium text-ink hover:bg-sand transition-colors"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const day = d.getDay();
                      const diff = (7 - day) % 7 || 7;
                      d.setDate(d.getDate() + diff);
                      setInterviewDate(d.toISOString().split("T")[0]);
                    }}
                    className="rounded-lg border border-border bg-sand/60 px-2.5 py-1 text-xs font-medium text-ink hover:bg-sand transition-colors"
                  >
                    Next Sunday Wave
                  </button>
                </div>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Time Slot & Bus Departure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <Clock className="size-3.5 text-violet-600" /> Assessment Time Slot
                  </label>
                  <select
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <Bus className="size-3.5 text-violet-600" /> Bus Departure Time
                  </label>
                  <input
                    type="text"
                    value={busTime}
                    onChange={(e) => setBusTime(e.target.value)}
                    placeholder="e.g. 10:30 AM Sharp"
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* BPO Site Selection */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-violet-600" /> Assessment Center / BPO Hub
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => {
                    setSelectedSiteId(e.target.value);
                    const preset = BPO_SITE_PRESETS.find((s) => s.id === e.target.value);
                    if (preset && preset.recommendedBusHubs.length > 0) {
                      setBusPoint(preset.recommendedBusHubs[0]);
                    }
                  }}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white mb-2"
                >
                  {BPO_SITE_PRESETS.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.shortName} — {site.area}
                    </option>
                  ))}
                  <option value="custom">Custom Site / Office Address...</option>
                </select>

                {selectedSiteId === "custom" ? (
                  <div className="space-y-2 p-3 rounded-xl border border-border bg-sand/30">
                    <input
                      type="text"
                      placeholder="Center or Office Name (e.g. Sutherland Tech Lab)"
                      value={customSiteName}
                      onChange={(e) => setCustomSiteName(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs text-ink outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                    <input
                      type="text"
                      placeholder="Full Address & Floor details"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs text-ink outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                    <input
                      type="url"
                      placeholder="Google Maps Navigation Link"
                      value={customMapsUrl}
                      onChange={(e) => setCustomMapsUrl(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs text-ink outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                ) : (
                  activePreset && (
                    <div className="p-2.5 rounded-xl border border-violet-100 bg-violet-50/50 text-xs space-y-1">
                      <div className="font-medium text-ink flex items-center justify-between">
                        <span>📍 {activePreset.address}</span>
                        <a
                          href={activePreset.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
                        >
                          <ExternalLink className="size-3" /> View Map
                        </a>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        🛡️ Gate Security: {activePreset.gateSecurityNote}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Shuttle Bus Meeting Point */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                  <Bus className="size-3.5 text-violet-600" /> Shuttle Bus Pickup Point
                </label>
                <select
                  value={busPoint}
                  onChange={(e) => setBusPoint(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
                >
                  {BUS_MEETING_POINTS.map((hub) => (
                    <option key={hub} value={hub}>
                      {hub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinator Phone & Dress Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <Phone className="size-3.5 text-violet-600" /> Coordinator Hotline
                  </label>
                  <input
                    type="text"
                    value={coordinatorPhone}
                    onChange={(e) => setCoordinatorPhone(e.target.value)}
                    placeholder="+2010..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="size-3.5 text-violet-600" /> Dress Code
                  </label>
                  <select
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
                  >
                    {DRESS_CODES.map((dc) => (
                      <option key={dc} value={dc}>
                        {dc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes / Special Instructions */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Special Gate or Candidate Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="e.g. Ask for HR reception at Gate 1, bring hardcopy CV"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sand transition-colors"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={scheduleInterview.isPending}
                  onClick={() => {
                    scheduleInterview.mutate({
                      id,
                      interview_date: interviewDate,
                      interview_time: interviewTime,
                      interview_site: currentSiteName,
                      interview_address: currentAddress,
                      interview_maps_link: currentMapsUrl,
                      interview_bus_point: busPoint,
                      interview_bus_time: busTime,
                      interview_notes: interviewNotes || null,
                      interview_attendance: "pending",
                    });
                  }}
                  className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-sand transition-colors disabled:opacity-60"
                >
                  {scheduleInterview.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Logistics Only"}
                </button>

                <button
                  type="button"
                  disabled={scheduleInterview.isPending}
                  onClick={() => {
                    const waMsg = buildFormalInterviewWhatsApp({
                      candidateName: app.full_name,
                      candidatePhone: app.phone,
                      roleTitle: role,
                      companyName: company,
                      interviewDate,
                      interviewTime,
                      siteName: currentSiteName,
                      siteAddress: currentAddress,
                      mapsUrl: currentMapsUrl,
                      busMeetingPoint: busPoint,
                      busDepartureTime: busTime,
                      dressCode,
                      hrCoordinatorPhone: hrPhone || coordinatorPhone,
                    });

                    scheduleInterview.mutate(
                      {
                        id,
                        interview_date: interviewDate,
                        interview_time: interviewTime,
                        interview_site: currentSiteName,
                        interview_address: currentAddress,
                        interview_maps_link: currentMapsUrl,
                        interview_bus_point: busPoint,
                        interview_bus_time: busTime,
                        interview_notes: interviewNotes || null,
                        interview_attendance: "pending",
                      },
                      {
                        onSuccess: () => {
                          const waUrl = `https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(waMsg)}`;
                          window.open(waUrl, "_blank");
                        },
                      }
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#20ba5a] transition-colors shadow-md disabled:opacity-60"
                >
                  {scheduleInterview.isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                  Save & Open WhatsApp Invite 🚀
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          /* Hide sidebar, navigation menus, breadcrumbs, modals, and edit/outreach buttons */
          aside, header, nav, footer, .no-print, button, select, a[href^="https://wa.me"], a[href^="mailto:"], a[href^="tel:"] {
            display: none !important;
          }
          /* Reset print page canvas margins */
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-candidate-profile {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Visual element adjustments */
          .bg-white, .bg-card, .bg-[#f8f9fb] {
            background: transparent !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }
          .text-ink {
            color: black !important;
          }
          /* Prevent break inside cards */
          .rounded-2xl {
            page-break-inside: avoid;
            margin-bottom: 12px;
          }
        }
      `}</style>

      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between no-print mb-1">
        <Link to="/admin/applicants" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground group">
          <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Applicants
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-ink hover:bg-sand transition-all shadow-sm"
        >
          <Printer className="size-3.5" /> Export PDF
        </button>
      </div>

      {/* Recruitment Pipeline Stage */}
      <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-xs no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pipeline Stage
            </span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-bold border",
              PIPELINE_STAGES.find((s) => s.key === (app.pipeline_stage || "applied"))?.color || "bg-blue-100 text-blue-700 border-blue-200"
            )}>
              {PIPELINE_STAGES.find((s) => s.key === (app.pipeline_stage || "applied"))?.label || "Applied / New"}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Select a stage to transition candidate
          </span>
        </div>

        {/* Stage Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_STAGES.map((s) => {
            const isCurrent = (app.pipeline_stage || "applied") === s.key;
            const isSelected = selectedPendingStage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  if (isCurrent) return;
                  setSelectedPendingStage(isSelected ? null : s.key);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all text-left",
                  isCurrent
                    ? `${s.color} ring-2 ring-violet-500 ring-offset-1 font-bold`
                    : isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "border-border/80 bg-sand/30 text-ink/80 hover:bg-sand hover:text-ink"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Stage Change Confirmation Form */}
        {selectedPendingStage && (
          <div className="p-3.5 rounded-xl bg-sand/40 border border-violet-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Move to: <span className="text-violet-700 font-bold">{PIPELINE_STAGES.find(s => s.key === selectedPendingStage)?.label}</span>
              </span>
              <button
                type="button"
                onClick={() => { setSelectedPendingStage(null); setStageComment(""); }}
                className="text-xs text-muted-foreground hover:text-ink"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              placeholder="Leave comment or feedback (optional)"
              value={stageComment}
              onChange={(e) => setStageComment(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => updatePipelineStage.mutate({ stage: selectedPendingStage, comment: stageComment })}
                disabled={updatePipelineStage.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {updatePipelineStage.isPending ? "Updating..." : "Confirm Stage"}
              </button>
            </div>
          </div>
        )}

        {/* History Log */}
        {app.pipeline_history && app.pipeline_history.length > 0 && (
          <div className="border-t border-border/60 pt-3 space-y-1.5 max-h-36 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Stage History
            </div>
            {[...app.pipeline_history].reverse().map((entry, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono text-[11px] shrink-0">
                  {new Date(entry.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                  entry.role === "client_hr" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-800"
                )}>
                  {entry.role === "client_hr" ? "Client HR" : "Admin"}
                </span>
                <span className="font-semibold text-ink">
                  {PIPELINE_STAGES.find(s => s.key === entry.stage)?.label || entry.stage}
                </span>
                {entry.comment && (
                  <span className="text-muted-foreground italic truncate max-w-xs md:max-w-md">
                    — "{entry.comment}"
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground/60 ml-auto shrink-0">
                  by {entry.changed_by}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── HERO CARD ── */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className={cn("h-1.5 w-full bg-gradient-to-r",
          app.status === "hired" ? "from-emerald-500 to-emerald-400" :
          app.status === "shortlisted" ? "from-amber-500 to-amber-400" :
          app.status === "rejected" ? "from-red-500 to-red-400" :
          "from-blue-500 to-blue-400",
        )} />

        <div className="p-5">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            {/* Identity */}
            <div className="flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
                {app.full_name[0]?.toUpperCase()}
              </div>
              <div>
                {editMode && editFields ? (
                  <div className="space-y-2">
                    <input
                      value={editFields.full_name}
                      onChange={e => setEditFields(f => f ? { ...f, full_name: e.target.value } : f)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-lg font-bold text-ink outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Full name"
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={editFields.email}
                        onChange={e => setEditFields(f => f ? { ...f, email: e.target.value } : f)}
                        className="flex-1 min-w-48 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Email"
                        type="email"
                      />
                      <input
                        value={editFields.phone}
                        onChange={e => setEditFields(f => f ? { ...f, phone: e.target.value } : f)}
                        className="flex-1 min-w-40 rounded-lg border border-border px-3 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Phone (auto-prefixed)"
                      />
                    </div>
                    <input
                      value={editFields.location}
                      onChange={e => setEditFields(f => f ? { ...f, location: e.target.value } : f)}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Location"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">{app.full_name}</h1>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", statusCfg.cls)}>
                        <span className={cn("size-1.5 rounded-full", statusCfg.dot)} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Mail className="size-3.5" />{app.email}
                      </a>
                      <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors font-mono">
                        <Phone className="size-3.5" />{app.phone}
                      </a>
                      {app.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{app.location}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <Briefcase className="size-3.5 text-muted-foreground" />
                      <span>Applied for <b>{role}</b> at <b>{company}</b></span>
                      {app.created_at && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(app.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 shrink-0 no-print">
              {editMode ? (
                <>
                  <button
                    onClick={saveProfile}
                    disabled={updateProfile.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Changes
                  </button>
                  <button
                    onClick={() => { setEditMode(false); }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
                  >
                    <X className="size-4" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const accessCode = generateCandidateAccessCode(app.id);
                      const shareUrl = `${window.location.origin}/c/${app.id}?code=${accessCode}`;
                      const msg =
                        `🌟 *QuickHire Candidate Profile: ${app.full_name}*\n` +
                        `💼 *Role:* ${role} (${company})\n` +
                        `🗣️ *English Level:* ${app.english_level || "B2+"} | *AI Score:* ${liveTotal}/30\n` +
                        `🛡️ *Access Code:* ${accessCode}\n\n` +
                        `Review full candidate dossier, listen to voice note recordings, and extend an offer directly here:\n` +
                        `👉 ${shareUrl}\n\n` +
                        `*QuickHire Egypt Operations*`;

                      navigator.clipboard.writeText(msg).then(() => {
                        toast.success(`Shareable candidate link & access code (${accessCode}) copied!`);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 transition-colors shadow-2xs"
                    title="Copy WhatsApp Share Link with Access Code"
                  >
                    <Share2 className="size-4 text-violet-600" /> Share to Company HR
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
                  >
                    <Edit3 className="size-4" /> Edit Profile
                  </button>
                  <a
                    href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(buildCandidateWaMsg(app.full_name, role, company))}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                  <a
                    href={`mailto:${app.email}?subject=${encodeURIComponent(`Your application for ${role} — QuickHire`)}&body=${encodeURIComponent(`Hi ${app.full_name},\n\nThank you for your application.\n\n`)}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Mail className="size-4" /> Email
                  </a>
                  <a
                    href={`tel:${app.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors"
                  >
                    <Phone className="size-4" /> Call
                  </a>
                  <button
                    onClick={() => setScheduleModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
                  >
                    <CalendarCheck className="size-4" />
                    {app.interview_date ? "Reschedule Wave" : "Schedule Interview"}
                  </button>
                  <button
                    onClick={() => rescore.mutate()}
                    disabled={rescore.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-sand transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("size-4", rescore.isPending && "animate-spin")} /> Re-score
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="size-4" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 90-DAY CLIENT COOLDOWN GUARDRAIL HERO BANNER ── */}
      {cooldownInfo.hasCooldownRisk && (
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-800 shadow-xs">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-amber-950">
                    ⚠️ 90-Day BPO Client Cooldown Warning ({company})
                  </h3>
                  <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 border border-amber-300">
                    Gate Risk
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-900 leading-relaxed font-medium">
                  {cooldownInfo.reason}
                </p>
                {cooldownInfo.recommendedAction && (
                  <p className="mt-1 text-[11px] text-amber-800">
                    <b>Recommended:</b> {cooldownInfo.recommendedAction}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById("smart-pooling-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-800 transition-colors shadow-soft shrink-0"
            >
              <Compass className="size-3.5" /> Re-Route via Smart Pool
            </button>
          </div>
        </div>
      )}

      {/* ── INTERVIEW LOGISTICS & NO-SHOW KILLER HUB ── */}
      <div className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all",
        app.interview_date
          ? "border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-violet-50/30"
          : "border-border/60 bg-white"
      )}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "grid size-9 place-items-center rounded-xl",
              app.interview_date ? "bg-violet-600 text-white shadow-xs" : "bg-primary/10 text-primary"
            )}>
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                On-Site Interview & Wave Logistics
                {app.interview_date && (
                  <span className="text-xs font-normal text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
                    Active Schedule
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {app.interview_date
                  ? "Logistics confirmed. Send automated WhatsApp invitations, shuttle bus hubs, and gate passes."
                  : "No interview scheduled yet. Set the date, BPO site, shuttle bus hub, and attendance pass."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <CalendarCheck className="size-3.5" />
              {app.interview_date ? "Reschedule / Edit Logistics" : "Schedule Interview & Bus Slot"}
            </button>
          </div>
        </div>

        {app.interview_date ? (
          <div className="space-y-4">
            {/* Grid of logistics items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-xs">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Calendar className="size-3 text-violet-600" /> Date & Time Slot
                </div>
                <div className="font-semibold text-ink text-sm">{app.interview_date}</div>
                <div className="text-xs font-mono text-violet-700 font-medium">{app.interview_time || "11:30 AM"}</div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-xs">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MapPin className="size-3 text-violet-600" /> BPO Hub & Site
                </div>
                <div className="font-semibold text-ink text-sm truncate" title={app.interview_site || ""}>
                  {app.interview_site || "Smart Village"}
                </div>
                {app.interview_maps_link && (
                  <a
                    href={app.interview_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink className="size-2.5" /> Google Maps Pin
                  </a>
                )}
              </div>

              <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-xs">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Bus className="size-3 text-violet-600" /> Shuttle Bus Meeting
                </div>
                <div className="font-semibold text-ink text-sm truncate" title={app.interview_bus_point || ""}>
                  {app.interview_bus_point || "Direct Arrival"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Departure: <b className="text-ink">{app.interview_bus_time || "40 min prior"}</b>
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-xs">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <BadgeCheck className="size-3 text-violet-600" /> Attendance Status
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border",
                    app.interview_attendance === "confirmed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    app.interview_attendance === "attended" ? "bg-blue-100 text-blue-800 border-blue-200" :
                    app.interview_attendance === "no_show" ? "bg-red-100 text-red-800 border-red-200" :
                    "bg-amber-100 text-amber-800 border-amber-200"
                  )}>
                    <span className={cn(
                      "size-1.5 rounded-full",
                      app.interview_attendance === "confirmed" ? "bg-emerald-500" :
                      app.interview_attendance === "attended" ? "bg-blue-500" :
                      app.interview_attendance === "no_show" ? "bg-red-500" :
                      "bg-amber-500"
                    )} />
                    {app.interview_attendance === "confirmed" ? "Confirmed ✓" :
                     app.interview_attendance === "attended" ? "Attended 🏢" :
                     app.interview_attendance === "no_show" ? "No-Show ⚠️" :
                     "Pending Confirmation"}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Toggles & WhatsApp Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-violet-100 no-print">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Update Status:</span>
                <button
                  onClick={() => updateAttendance.mutate("confirmed")}
                  disabled={updateAttendance.isPending}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                    app.interview_attendance === "confirmed"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-border bg-white text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                  )}
                >
                  Confirmed
                </button>
                <button
                  onClick={() => updateAttendance.mutate("attended")}
                  disabled={updateAttendance.isPending}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                    app.interview_attendance === "attended"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border bg-white text-muted-foreground hover:bg-blue-50 hover:text-blue-700"
                  )}
                >
                  Attended
                </button>
                <button
                  onClick={() => updateAttendance.mutate("no_show")}
                  disabled={updateAttendance.isPending}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                    app.interview_attendance === "no_show"
                      ? "bg-red-600 text-white border-red-600"
                      : "border-border bg-white text-muted-foreground hover:bg-red-50 hover:text-red-700"
                  )}
                >
                  No-Show
                </button>
                <button
                  onClick={() => updateAttendance.mutate("pending")}
                  disabled={updateAttendance.isPending}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                    app.interview_attendance === "pending" || !app.interview_attendance
                      ? "bg-amber-500 text-white border-amber-500"
                      : "border-border bg-white text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                  )}
                >
                  Reset Pending
                </button>
              </div>

              {/* Direct One-Click WhatsApp Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(formalInviteWaMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20ba5a] transition-colors shadow-xs"
                >
                  <MessageCircle className="size-3.5" /> Send WhatsApp Invite & Gate Pass
                </a>
                <a
                  href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(reminder24hWaMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  <Clock3 className="size-3.5 text-amber-700" /> Send 24h Reminder
                </a>
                <a
                  href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(checkin2hWaMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 transition-colors"
                >
                  <AlertCircle className="size-3.5 text-red-600" /> Send 2h Check-in
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-sand/40 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              This candidate is not scheduled yet. Pick an interview wave, BPO center, and transportation hub to generate a no-show proof invitation.
            </p>
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <CalendarCheck className="size-4" /> Schedule On-Site Assessment Now
            </button>
          </div>
        )}
      </div>

      {/* ── SCORES SECTION ── */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
            <Target className="size-4 text-primary" /> AI Assessment Scores
          </h2>
          <div className="flex items-center gap-2">
            {editingScore !== null ? (
              <>
                <button
                  onClick={saveScores}
                  disabled={update.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <Check className="size-3.5" /> Save scores
                </button>
                <button
                  onClick={() => {
                    setScoreEdits({ english: app.english_score ?? 0, comm: app.comm_score ?? 0, exp: app.exp_score ?? 0 });
                    setEditingScore(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sand"
                >
                  <X className="size-3.5" /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingScore("english")}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sand hover:text-primary transition-colors"
              >
                <Edit3 className="size-3.5" /> Edit scores
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <ScoreCard
            label="English Fluency"
            score={liveEng}
            max={10}
            editing={editingScore !== null}
            onChange={(v) => { setScoreEdits(s => s ? { ...s, english: v } : s); setEditingScore("english"); }}
          />
          <ScoreCard
            label="Communication"
            score={liveComm}
            max={10}
            editing={editingScore !== null}
            onChange={(v) => { setScoreEdits(s => s ? { ...s, comm: v } : s); setEditingScore("comm"); }}
          />
          <ScoreCard
            label="Experience"
            score={liveExp}
            max={10}
            editing={editingScore !== null}
            onChange={(v) => { setScoreEdits(s => s ? { ...s, exp: v } : s); setEditingScore("exp"); }}
          />
          <div className={cn("rounded-2xl p-5 text-white bg-gradient-to-br shadow-soft flex flex-col", totalGradeInfo.color)}>
            <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Total Score</div>
            <div className="font-display text-4xl font-bold mt-auto">
              {liveTotal}<span className="text-lg opacity-70">/30</span>
            </div>
            <div className="mt-2 text-xs font-semibold opacity-90">{totalGradeInfo.label}</div>
            <div className="mt-1 text-[10px] opacity-70 capitalize">Status: {app.scoring_status}</div>
          </div>
        </div>

        {/* Score bar visual */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "English", val: liveEng },
            { label: "Communication", val: liveComm },
            { label: "Experience", val: liveExp },
          ].map(({ label, val }) => {
            const g = scoreGrade(val, 10);
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-bold", g.color)}>{val}/10 · {g.label}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", g.bar)} style={{ width: `${(val / 10) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI ANALYSIS ── */}
      {app.ai_notes && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-200/60">
              <Zap className="size-4 text-amber-700" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">AI Recommendation</div>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{app.ai_notes}</p>
        </div>
      )}

      {/* ── CLIENT ASSESSMENT OUTCOME & SCORECARD ── */}
      <div className="rounded-2xl border border-border/80 bg-white shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <BadgeCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold text-ink">
                  Client Interview Outcome &amp; Scorecard
                </h2>
                {app.outcome_code && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border",
                    getOutcomeDefinition(app.outcome_code)?.badgeStyle || "bg-sand text-ink border-border"
                  )}>
                    {getOutcomeDefinition(app.outcome_code)?.shortLabel || app.outcome_code}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Record exact reason codes from the client assessment (V&amp;A, Ops, Tech, or Candidate Decision).
              </p>
            </div>
          </div>

          {selectedOutcomeCode && (
            <button
              onClick={() => {
                const def = getOutcomeDefinition(selectedOutcomeCode);
                updateOutcome.mutate({
                  outcome_code: selectedOutcomeCode,
                  outcome_notes: outcomeNotesInput,
                  status: def?.defaultStatus,
                });
              }}
              disabled={updateOutcome.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
            >
              {updateOutcome.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save Outcome &amp; Update Status
            </button>
          )}
        </div>

        {/* Outcome Option Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {OUTCOME_CODES.map((o) => {
            const isSelected = (selectedOutcomeCode || app.outcome_code) === o.code;
            return (
              <button
                key={o.code}
                type="button"
                onClick={() => {
                  setSelectedOutcomeCode(o.code);
                  updateOutcome.mutate({
                    outcome_code: o.code,
                    outcome_notes: outcomeNotesInput,
                    status: o.defaultStatus,
                  });
                }}
                className={cn(
                  "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border/80 bg-sand/30 hover:bg-sand hover:border-border"
                )}
              >
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border mb-1", o.badgeStyle)}>
                  {o.shortLabel}
                </span>
                <span className="text-[11px] font-semibold text-ink leading-tight">{o.label}</span>
              </button>
            );
          })}
        </div>

        {/* Outcome Notes Textarea */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Client Evaluator Notes &amp; Feedback:
          </label>
          <textarea
            value={outcomeNotesInput}
            onChange={(e) => setOutcomeNotesInput(e.target.value)}
            placeholder="e.g. Cleared Ops interview with score 4/5. Voice & Accent test pronunciation was acceptable for US account, but rejected for UK account..."
            rows={2}
            className="w-full rounded-xl border border-border bg-white p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* ── SMART ACCOUNT POOLING & ZERO-WASTE RE-ROUTING ── */}
      <div id="smart-pooling-section" className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/20 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Compass className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                Smart Account Match & Wave Pooling
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                  Zero-Waste Engine
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Matches candidate's CEFR fluency, commute, and experience against active hiring waves to prevent candidate drop-off.
              </p>
            </div>
          </div>
          {poolMatches.length > 0 && (
            <span className="text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-xl shadow-2xs">
              {poolMatches.length} Alternative Wave{poolMatches.length !== 1 ? "s" : ""} Available
            </span>
          )}
        </div>

        {app.outcome_code && (
          <div className="mb-4 rounded-xl border border-indigo-200 bg-white p-3.5 text-xs text-indigo-950 flex items-start gap-2.5 shadow-2xs">
            <Compass className="size-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <b className="font-semibold">Smart Pooling Insight ({getOutcomeDefinition(app.outcome_code)?.shortLabel}): </b>
              <span>{getOutcomeDefinition(app.outcome_code)?.smartPoolAction}</span>
            </div>
          </div>
        )}

        {app.status === "rejected" && !app.outcome_code && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b className="font-semibold">Candidate is rejected for current role:</b> Don't lose this qualified lead! Fast-track them into one of the matching active waves below with a single click.
            </div>
          </div>
        )}

        {poolMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {poolMatches.map((m) => {
              const rerouteWaMsg = buildRerouteWhatsAppInvite(
                app.full_name,
                m.offer.title,
                m.offer.company,
                m.offer.salary_text,
                m.matchReasons[0]
              );

              return (
                <div
                  key={m.offer.id}
                  className="rounded-xl border border-border/80 bg-white p-4 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <h3 className="font-semibold text-ink text-sm leading-tight">
                          {m.offer.title}
                        </h3>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Building2 className="size-3 text-indigo-600" />
                          <span>{m.offer.company}</span>
                          <span>·</span>
                          <MapPin className="size-3 text-muted-foreground" />
                          <span className="truncate">{m.offer.location}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
                          {m.matchScore}% Match
                        </span>
                        <div className="text-[10px] uppercase font-bold text-indigo-600 mt-0.5">
                          {m.tier} Tier
                        </div>
                      </div>
                    </div>

                    <div className="my-2.5 rounded-lg bg-indigo-50/50 p-2 text-xs space-y-1">
                      <div className="font-mono font-semibold text-indigo-900 flex items-center justify-between">
                        <span>Salary: {m.offer.salary_text}</span>
                        {m.offer.language && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            Lang: {m.offer.language}
                          </span>
                        )}
                      </div>
                      {m.matchReasons.map((r, idx) => (
                        <div key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fast-Track Actions */}
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 no-print">
                    <button
                      type="button"
                      disabled={rerouteApplicant.isPending}
                      onClick={() =>
                        rerouteApplicant.mutate({
                          new_offer_id: m.offer.id,
                          reason: m.matchReasons[0] || "Language & experience match",
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-60"
                    >
                      {rerouteApplicant.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
                      Fast-Track to This Wave
                    </button>

                    <a
                      href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(rerouteWaMsg)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
                      title="Send WhatsApp invitation informing the candidate of fast-track re-routing"
                    >
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      WhatsApp Invite
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-white p-4 text-center text-xs text-muted-foreground">
            No alternative active waves currently open matching this profile.
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Candidate profile */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
              <User className="size-4 text-primary" /> Candidate Profile
            </h2>
            {editMode && editFields ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Age", field: "age" as const, placeholder: "e.g. 26", type: "number" },
                  { label: "English Level", field: "english_level" as const, placeholder: "e.g. C1 Advanced" },
                  { label: "Experience (yrs)", field: "experience_years" as const, placeholder: "e.g. 3", type: "number" },
                  { label: "Education", field: "grad_status" as const, placeholder: "e.g. Graduate" },
                  { label: "Salary Target (EGP)", field: "salary_expectation" as const, placeholder: "e.g. 16000" },
                ].map(({ label, field, placeholder, type }) => (
                  <div key={field} className="rounded-xl bg-[#f8f9fb] p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
                    {field === "grad_status" ? (
                      <select
                        value={editFields[field] ?? ""}
                        onChange={e => setEditFields(f => f ? { ...f, [field]: e.target.value } : f)}
                        className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Select option</option>
                        <option value="grad">grad</option>
                        <option value="undergrad">undergrad</option>
                        <option value="dropout">dropout</option>
                      </select>
                    ) : (
                      <input
                        type={type ?? "text"}
                        value={editFields[field] ?? ""}
                        onChange={e => setEditFields(f => f ? { ...f, [field]: e.target.value } : f)}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Star, label: "Age", value: app.age ? `${app.age} yrs` : "—" },
                  { icon: Globe, label: "English Level", value: app.english_level ?? "—" },
                  { icon: Briefcase, label: "Experience", value: app.experience_years != null ? `${app.experience_years} yr${app.experience_years !== 1 ? "s" : ""}` : "—" },
                  { icon: GraduationCap, label: "Education", value: app.grad_status ?? "—" },
                  { icon: DollarSign, label: "Salary Target", value: app.salary_expectation ? `${Number(app.salary_expectation).toLocaleString()} EGP` : "—" },
                  { icon: MapPin, label: "Location", value: app.location ?? "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-[#f8f9fb] p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
                    </div>
                    <div className="text-sm font-semibold text-ink">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application answers */}
          {app.answers && Object.keys(app.answers).length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
              <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
                <BadgeCheck className="size-4 text-primary" /> Application Answers
              </h2>
              <div className="space-y-3">
                {Object.entries(app.answers).filter(([, v]) => v).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border/60 bg-[#f8f9fb] px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm text-ink">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral & Ambassador Intelligence */}
          <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/50 to-purple-50/30 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                <Gift className="size-4 text-violet-600" /> Referral &amp; Ambassador Channel
              </h2>
              {app.referred_by ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  Referred Candidate
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                  Direct / Organic
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-violet-100 bg-white p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Referred By (Ambassador)
                </div>
                {app.referred_by ? (
                  <div>
                    <div className="text-sm font-bold text-violet-900 font-mono flex items-center gap-1.5">
                      <Gift className="size-3.5 text-violet-600" /> {app.referred_by}
                    </div>
                    <div className="text-xs text-emerald-700 font-medium mt-1">
                      💰 Reward on Hire: 1,000 – 3,500 EGP (Vodafone Cash / InstaPay)
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No referrer code entered.</div>
                )}
              </div>

              <div className="rounded-xl border border-violet-100 bg-white p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Candidate's Referral Code
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink font-mono">{candidateRefCode}</span>
                  <button
                    type="button"
                    onClick={() => copyText(candidateRefCode, "candidate-ref-code")}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 font-semibold hover:underline"
                  >
                    {copied === "candidate-ref-code" ? <CheckCheck className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    Copy
                  </button>
                </div>
                <div className="mt-2">
                  <a
                    href={adminReferralWaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="size-3 text-emerald-600" /> Ask {app.full_name.split(" ")[0]} for Referrals
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CV Section */}
          {/* CV Section */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText className="size-4 text-primary" /> CV / Resume
            </h2>
            {app.cv_path ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-[#f8f9fb] p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{app.cv_path.split("/").pop()}</div>
                    <div className="text-xs text-muted-foreground">{(cvUrl && cvUrl !== "/placeholder-cv.pdf") ? "PDF ready to open & download" : "Demo candidate — placeholder CV"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(cvUrl && cvUrl !== "/placeholder-cv.pdf") ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <BadgeCheck className="size-3" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Demo
                      </span>
                    )}
                    <a
                      href={cvUrl || "#"}
                      onClick={(e) => {
                        if (cvUrl === "/placeholder-cv.pdf") {
                          toast.info("This is a demo candidate. Opening sample placeholder CV.");
                        }
                      }}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <ExternalLink className="size-3" /> Open
                    </a>
                    <a
                      href={cvUrl || "#"}
                      onClick={(e) => {
                        if (cvUrl === "/placeholder-cv.pdf") {
                          toast.info("This is a demo candidate. Downloading sample placeholder CV.");
                        }
                      }}
                      download={app.cv_path?.split("/").pop()}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <Download className="size-3" /> Download
                    </a>
                    <button
                      onClick={handleCopyCv}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-sm",
                        copied === "cv-file"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-border bg-white text-muted-foreground hover:text-primary hover:border-primary/30"
                      )}
                      title="Copy CV file to clipboard to paste (Ctrl+V) directly in WhatsApp"
                    >
                      {copied === "cv-file" ? <CheckCheck className="size-3" /> : <Copy className="size-3" />}
                      Copy File
                    </button>
                  </div>
                </div>
                {/* WhatsApp with CV link */}
                {hrPhone && (
                  <a
                    href={`https://wa.me/${waNumber(hrPhone)}?text=${encodeURIComponent(`Hi, please find the CV for candidate *${app.full_name}* for the *${role}* role.\n\nCV Link: ${app.cv_path}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    Send CV link to Company HR via WhatsApp
                  </a>
                )}

                {/* Manual CV Review */}
                <div className="mt-4 border-t border-border/50 pt-4 space-y-3">
                  <div className="flex items-center justify-between no-print">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manual CV Review</span>
                    <div className="flex gap-1.5">
                      {(["pending", "approved", "rejected"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => update.mutate({ cv_review_status: st })}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize border transition-all",
                            (app.cv_review_status ?? "pending") === st
                              ? st === "approved"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                : st === "rejected"
                                  ? "bg-rose-100 text-rose-700 border-rose-300"
                                  : "bg-amber-100 text-amber-700 border-amber-300"
                              : "bg-white text-muted-foreground border-border hover:bg-sand"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 no-print">
                      CV Assessment Notes
                    </label>
                    <div className="no-print">
                      <textarea
                        defaultValue={app.cv_review_notes ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (app.cv_review_notes ?? "")) {
                            update.mutate({ cv_review_notes: e.target.value });
                          }
                        }}
                        placeholder="Write your review notes for the resume..."
                        className="w-full rounded-xl border border-border bg-sand/30 p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-primary/20 min-h-[60px]"
                      />
                    </div>
                    {app.cv_review_notes && (
                      <div className="hidden print:block text-xs text-ink bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                        <span className="font-bold text-[10px] uppercase text-slate-500 block mb-1">Manual CV Assessment:</span>
                        <p className="whitespace-pre-wrap font-sans">{app.cv_review_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-[#f8f9fb] p-6 text-center">
                <FileText className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No CV uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Voice Notes */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
              <Mic className="size-4 text-primary" /> Voice Notes & Transcripts
            </h2>
            {(app.voice_notes ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-[#f8f9fb] p-6 text-center">
                <Mic className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No voice notes submitted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(app.voice_notes ?? []).map((v, i) => (
                  <VoiceNoteCard
                    key={v.path ?? i}
                    voiceNote={v}
                    index={i}
                    transcript={app.transcripts?.[v.lang] ?? null}
                    onCopy={(text, key) => copyText(text, key)}
                    copied={copied}
                    hrPhone={hrPhone}
                    candidateName={app.full_name}
                    role={role}
                    waNumber={waNumber}
                    appId={id}
                    onUpdateTranscript={(lang, text) => {
                      const newTranscripts = { ...(app.transcripts ?? {}), [lang]: text };
                      update.mutate({ transcripts: newTranscripts });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Contact shortcuts for CANDIDATE (No-Show Killer Suite) */}
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5 no-print">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                <Send className="size-4 text-primary" /> WhatsApp Outreach & Gate Passes
              </h2>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className="text-xs text-violet-600 font-semibold hover:underline"
              >
                Logistics Setup
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              One-click WhatsApp triggers with logistics, shuttle bus timing, and attendance check-ins.
            </p>

            <div className="space-y-2">
              {[
                {
                  label: "1. Formal Invite & Gate Pass",
                  badge: "Logistics",
                  msg: formalInviteWaMsg,
                },
                {
                  label: "2. 24h Reminder (Tomorrow)",
                  badge: "Nudge",
                  msg: reminder24hWaMsg,
                },
                {
                  label: "3. 2h Urgent Gate Check-in",
                  badge: "Arrival",
                  msg: checkin2hWaMsg,
                },
                {
                  label: "4. Share Maps Navigation Pin",
                  badge: "Location",
                  msg: mapsPinWaMsg,
                },
                {
                  label: "5. Reschedule Inquiry",
                  badge: "Follow-up",
                  msg: rescheduleWaMsg,
                },
                {
                  label: "6. Initial Phone Screen",
                  badge: "First Touch",
                  msg: buildCandidateWaMsg(app.full_name, role, company),
                },
                {
                  label: "7. Job Offer Confirmation",
                  badge: "Hired",
                  msg: buildOfferMsg(app.full_name, role, company),
                },
                {
                  label: "8. Polite Rejection",
                  badge: "Closed",
                  msg: buildRejectionMsg(app.full_name, role),
                },
                {
                  label: "9. Request Foreign Language / Peer Referrals",
                  badge: "Bounty 🎁",
                  msg: referralRequestWaMsg,
                },
              ].map(({ label, badge, msg }) => (
                <div key={label} className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${waNumber(app.phone)}?text=${encodeURIComponent(msg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <MessageCircle className="size-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded shrink-0">
                      {badge}
                    </span>
                  </a>
                  <button
                    onClick={() => copyText(msg, `wa-${label}`)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-sand"
                    title="Copy message"
                  >
                    {copied === `wa-${label}` ? <CheckCheck className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Email shortcuts */}
            <div className="mt-3 space-y-2">
              {[
                {
                  label: "Shortlist notification",
                  subject: `You've been shortlisted — ${role} at ${company}`,
                  body: `Hi ${app.full_name},\n\nCongratulations! You've been shortlisted for the ${role} position at ${company}.\n\nOur team will be in touch shortly with the next steps.\n\nBest regards,\nQuickHire Recruitment Team`,
                },
                {
                  label: "Interview scheduling",
                  subject: `Interview invitation — ${role} at ${company}`,
                  body: `Hi ${app.full_name},\n\nWe're pleased to invite you for an interview for the ${role} role at ${company}.\n\nPlease reply with your availability this week.\n\nBest regards,\nQuickHire Recruitment Team`,
                },
              ].map(({ label, subject, body }) => (
                <a
                  key={label}
                  href={`mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <Mail className="size-3.5 shrink-0 text-blue-600" />
                  Email: {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SHARE TO COMPANY HR ── */}
      <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-violet-50/30 shadow-sm p-5 no-print">
        <h2 className="font-display text-base font-semibold text-ink mb-1 flex items-center gap-2">
          <Share2 className="size-4 text-violet-600" /> Share Full Profile to Company HR
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Send the complete candidate profile — scores, transcript, all details — directly to the company's HR.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          {hrPhone && (
            <a
              href={`https://wa.me/${waNumber(hrPhone)}?text=${encodeURIComponent(shareMsg)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <MessageCircle className="size-4" />
              Send to Company HR via WhatsApp
            </a>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20ba5a] transition-colors shadow-sm"
          >
            <MessageCircle className="size-4" />
            Share Profile via WhatsApp
          </a>
          <button
            onClick={() => copyText(shareMsg, "share-profile")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm",
              copied === "share-profile"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
            )}
          >
            {copied === "share-profile" ? <CheckCheck className="size-4" /> : <Copy className="size-4" />}
            {copied === "share-profile" ? "Copied!" : "Copy Full Profile"}
          </button>
          <a
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interview: ${app.full_name} — ${role} @ ${company}`)}&details=${encodeURIComponent(`Candidate: ${app.full_name}\nPhone: ${app.phone}\nEmail: ${app.email}\nRole: ${role}\nCompany: ${company}\nScore: ${liveTotal}/30\n\nScheduled via QuickHire`)}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-sand transition-colors shadow-sm"
          >
            <Calendar className="size-4" /> Add Interview to Calendar
          </a>
        </div>

        {/* Preview of share message */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 select-none">
            <ExternalLink className="size-3" />
            Preview message that will be sent
          </summary>
          <div className="mt-3 rounded-xl border border-violet-200 bg-white p-4">
            <pre className="whitespace-pre-wrap text-xs text-ink font-sans leading-relaxed max-h-64 overflow-y-auto">{shareMsg}</pre>
          </div>
        </details>
      </div>

      {/* ── RECRUITMENT DECISION ── */}
      <div className="rounded-2xl border border-border/60 bg-white shadow-sm p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" /> Recruitment Decision
        </h2>

        {/* Status buttons */}
        <div className="flex flex-wrap gap-2 mb-5 no-print">
          {(["new", "shortlisted", "hired", "rejected"] as const).map((s) => {
            const cfg = STATUS_CFG[s];
            const isActive = app.status === s;
            return (
              <button
                key={s}
                onClick={() => update.mutate({ status: s })}
                disabled={update.isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? cfg.cls + " shadow-soft scale-[1.02]"
                    : "border-border bg-card text-muted-foreground hover:bg-sand hover:text-foreground",
                )}
              >
                <span className={cn("size-2 rounded-full", isActive ? cfg.dot : "bg-muted-foreground/30")} />
                {cfg.label}
                {isActive && <Check className="size-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Admin notes */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground no-print">
            Internal Notes <span className="font-normal normal-case">(auto-saved on blur, private)</span>
          </label>
          <div className="no-print">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (app.admin_notes ?? "") && update.mutate({ admin_notes: notes })}
              placeholder="Add private notes about this candidate — interview feedback, salary negotiation, flags…"
              rows={4}
              className="w-full rounded-xl border border-border bg-[#f8f9fb] p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/60"
            />
          </div>
          {notes && (
            <div className="hidden print:block text-sm text-ink bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
              <span className="font-bold text-xs uppercase text-slate-500 block mb-1">HR Internal Assessment Notes:</span>
              <p className="whitespace-pre-wrap font-sans">{notes}</p>
            </div>
          )}
          {app.updated_at && (
            <div className="mt-1 text-[10px] text-muted-foreground no-print">Last updated: {new Date(app.updated_at).toLocaleString("en-GB")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── VOICE NOTE CARD WITH REAL AUDIO PLAYER ── */
function VoiceNoteCard({
  voiceNote, index, transcript, onCopy, copied, hrPhone, candidateName, role, waNumber, onUpdateTranscript, appId,
}: {
  voiceNote: { lang: string; path: string; data?: string };
  index: number;
  transcript: string | null;
  onCopy: (text: string, key: string) => void;
  copied: string | null;
  hrPhone: string | null;
  candidateName: string;
  role: string;
  waNumber: (phone: string) => string;
  onUpdateTranscript?: (lang: string, text: string) => void;
  appId: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(transcript ?? "");
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [vnCopied, setVnCopied] = useState(false);

  useEffect(() => {
    setEditVal(transcript ?? "");
  }, [transcript]);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function loadAudio() {
      // 1. Fallback to voiceNote.data if it's base64
      if (voiceNote.data) {
        setAudioSrc(voiceNote.data);
        return;
      }

      // 2. Try loading from IndexedDB
      try {
        const file = await getFile(`${appId}-voice-${voiceNote.lang}`);
        if (file && active) {
          url = URL.createObjectURL(file);
          setAudioSrc(url);
        } else if (active) {
          // Fallback to placeholder audio so it always works
          setAudioSrc("/placeholder-audio.mp3");
        }
      } catch (err) {
        console.error("Failed to load voice note from IndexedDB", err);
        if (active) {
          setAudioSrc("/placeholder-audio.mp3");
        }
      }
    }

    loadAudio();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [appId, voiceNote.lang, voiceNote.data]);

  async function handleCopyVoiceNote() {
    try {
      let blob: Blob | null = null;
      if (audioSrc === "/placeholder-audio.mp3") {
        const res = await fetch("/placeholder-audio.mp3");
        blob = await res.blob();
      } else {
        const file = await getFile(`${appId}-voice-${voiceNote.lang}`);
        if (file) blob = file;
      }

      if (blob) {
        const item = new ClipboardItem({ [blob.type || "audio/webm"]: blob });
        await navigator.clipboard.write([item]);
        setVnCopied(true);
        setTimeout(() => setVnCopied(false), 2500);
        toast.success(`Voice note (${voiceNote.lang}) file copied to clipboard! You can paste (Ctrl+V) directly inside WhatsApp.`);
      } else {
        toast.error("Could not find voice note file.");
      }
    } catch (err) {
      console.error(err);
      toast.info("Browser security restricts copying audio files directly to clipboard. The voice note is downloading instead — drag & drop it directly into WhatsApp!");
      
      const link = document.createElement("a");
      link.href = audioSrc || "/placeholder-audio.mp3";
      link.download = `voice-note-${voiceNote.lang.toLowerCase()}.webm`;
      link.click();
    }
  }

  function handleSave() {
    if (onUpdateTranscript) {
      onUpdateTranscript(voiceNote.lang, editVal);
    }
    setIsEditing(false);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioSrc === "/placeholder-audio.mp3") {
        toast.info("Playing sample placeholder audio (this is a demo candidate).");
      }
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error", err);
        toast.error("Failed to play voice note. The audio file may be corrupted.");
      });
      setIsPlaying(true);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-[#f8f9fb] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-full bg-primary/10">
            <Mic className="size-3.5 text-primary" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Voice Note {index + 1} — {voiceNote.lang}
          </span>
        </div>
        <span className={`text-[10px] font-medium ${(audioSrc && audioSrc !== "/placeholder-audio.mp3") ? "text-emerald-600" : "text-amber-600"}`}>
          {(audioSrc && audioSrc !== "/placeholder-audio.mp3") ? "Audio ready ✓" : "Demo — placeholder audio"}
        </span>
      </div>

      {/* Real Audio Player */}
      <div className="rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-3 mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`grid size-9 shrink-0 place-items-center rounded-full text-white hover:opacity-90 transition-opacity shadow-sm ${audioSrc ? "bg-primary" : "bg-muted-foreground/40 cursor-not-allowed"}`}
            title={audioSrc ? (isPlaying ? "Pause" : "Play voice note") : "No audio"}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink truncate mb-1">
              {(audioSrc && audioSrc !== "/placeholder-audio.mp3") ? `voice-note-${voiceNote.lang.toLowerCase()}.webm` : "voice-note-placeholder.mp3"}
            </div>
            <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
              <div className={`h-full rounded-full bg-primary/60 transition-all duration-300 ${isPlaying ? "w-full" : "w-0"}`} />
            </div>
          </div>
          {audioSrc && (
            <div className="flex items-center gap-1.5">
              <a
                href={audioSrc}
                download={`voice-note-${voiceNote.lang.toLowerCase()}.webm`}
                className="grid size-7 place-items-center rounded-lg border border-primary/20 bg-white text-primary/60 hover:text-primary transition-colors"
                title="Download voice note file"
              >
                <Download className="size-3.5" />
              </a>
              <button
                onClick={handleCopyVoiceNote}
                className={cn(
                  "grid size-7 place-items-center rounded-lg border transition-colors",
                  vnCopied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                    : "border-primary/20 bg-white text-primary/60 hover:text-primary"
                )}
                title="Copy audio file to clipboard to paste (Ctrl+V) directly in WhatsApp"
              >
                {vnCopied ? <CheckCheck className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          )}
        </div>
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      {/* Transcript */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Transcript ({voiceNote.lang})
          </span>
          <button
            type="button"
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
            className="text-[10px] font-bold text-primary hover:underline"
          >
            {isEditing ? "Save" : "Edit Transcript"}
          </button>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              className="w-full rounded-xl border border-border bg-white p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-primary px-3 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditVal(transcript ?? "");
                  setIsEditing(false);
                }}
                className="rounded-lg border border-border px-3 py-1 text-[10px] font-medium text-muted-foreground hover:bg-sand"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : transcript ? (
          <div>
            <blockquote className="border-l-2 border-primary/30 pl-3 text-sm text-ink leading-relaxed italic">
              "{transcript}"
            </blockquote>
            <button
              onClick={() => onCopy(transcript, `transcript-${voiceNote.lang}`)}
              className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              {copied === `transcript-${voiceNote.lang}` ? <CheckCheck className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              Copy transcript
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Transcript not available</p>
        )}
      </div>

      {/* Share voice note to HR */}
      {hrPhone && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <a
            href={`https://wa.me/${waNumber(hrPhone)}?text=${encodeURIComponent(`Hi, please find the voice note for candidate *${candidateName}* applying for *${role}*.\n\nLanguage: ${voiceNote.lang}\nVoice note link: ${voiceNote.path || "On file"}\n${transcript ? `\nTranscript: "${transcript}"` : ""}`)}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="size-3.5 text-emerald-600" />
            Send voice note to Company HR via WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

/* ── SCORE CARD WITH EDITING ── */
function ScoreCard({
  label, score, max, editing, onChange,
}: {
  label: string; score: number; max: number; editing: boolean; onChange: (v: number) => void;
}) {
  const g = scoreGrade(score, max);
  const pct = (score / max) * 100;

  return (
    <div className="rounded-2xl border border-border/60 bg-[#f8f9fb] p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className={cn("font-display text-3xl font-bold", g.color)}>
        {score}<span className="text-sm font-normal text-muted-foreground">/{max}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-300", g.bar)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className={cn("text-[10px] font-semibold", g.color)}>{g.label}</span>
        {editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => score > 0 && onChange(score - 1)}
              className="grid size-5 place-items-center rounded border border-border bg-white text-muted-foreground hover:bg-sand hover:text-foreground transition-colors"
            >
              <ChevronDown className="size-3" />
            </button>
            <span className="w-5 text-center text-xs font-bold text-ink">{score}</span>
            <button
              onClick={() => score < max && onChange(score + 1)}
              className="grid size-5 place-items-center rounded border border-border bg-white text-muted-foreground hover:bg-sand hover:text-foreground transition-colors"
            >
              <ChevronUp className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
