import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays, Loader2, MessageCircle, Mail, ExternalLink,
  Clock, MapPin, Phone, Plus, Calendar, CheckCircle2, XCircle,
  AlertCircle, Bus, Navigation, Share2, Filter, Sparkles, Check
} from "lucide-react";
import {
  adminListApplications,
  adminScheduleInterview,
  adminUpdateInterviewAttendance,
  normalizePhone,
  type AdminApplicationRow,
} from "@/lib/applications.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/interviews")({
  head: () => ({
    meta: [
      { title: "Interview Operations — QuickHire Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewsPage,
});

const PRESET_HUBS = [
  {
    name: "Concentrix — Smart Village Building B12",
    address: "KM 28 Cairo-Alex Desert Road, Smart Village, Giza",
    mapsLink: "https://maps.google.com/?q=Smart+Village+Cairo",
    busPoint: "Lebanon Square (Mohandeseen)",
    busTime: "09:30 AM",
  },
  {
    name: "Sutherland — Maadi Degla Plaza",
    address: "Street 216, Maadi Degla, Cairo",
    mapsLink: "https://maps.google.com/?q=Maadi+Degla",
    busPoint: "Maadi Metro Station (Exit 2)",
    busTime: "10:15 AM",
  },
  {
    name: "Vodafone Horizon — Smart Village Building B19",
    address: "Smart Village KM 28, Cairo-Alex Road",
    mapsLink: "https://maps.google.com/?q=Smart+Village+Cairo",
    busPoint: "Abdel Moneim Riad Square",
    busTime: "09:00 AM",
  },
  {
    name: "Teleperformance — 5th Settlement Hub",
    address: "North 90th Street, New Cairo",
    mapsLink: "https://maps.google.com/?q=Teleperformance+Egypt",
    busPoint: "Abbassiya Metro Station",
    busTime: "09:15 AM",
  },
  {
    name: "Online Video Interview (Google Meet)",
    address: "Online / Remote",
    mapsLink: "https://meet.google.com",
    busPoint: "None (Remote)",
    busTime: "—",
  },
];

function InterviewsPage() {
  const qc = useQueryClient();
  const [filterAttendance, setFilterAttendance] = useState<string>("all");
  const [selectedHubIndex, setSelectedHubIndex] = useState<number>(0);

  // Form modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [targetCandidate, setTargetCandidate] = useState<AdminApplicationRow | null>(null);

  // Form inputs
  const [appId, setAppId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:30 AM");
  const [siteName, setSiteName] = useState(PRESET_HUBS[0].name);
  const [siteAddress, setSiteAddress] = useState(PRESET_HUBS[0].address);
  const [mapsLink, setMapsLink] = useState(PRESET_HUBS[0].mapsLink);
  const [busPoint, setBusPoint] = useState(PRESET_HUBS[0].busPoint);
  const [busTime, setBusTime] = useState(PRESET_HUBS[0].busTime);
  const [notes, setNotes] = useState("");
  const [waveTag, setWaveTag] = useState("");

  const appsQuery = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => adminListApplications({ data: {} }),
  });

  const scheduleMutation = useMutation({
    mutationFn: adminScheduleInterview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast.success("Interview scheduled and saved permanently!");
      setScheduleModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to schedule interview");
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: adminUpdateInterviewAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast.success("Attendance status updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update attendance");
    },
  });

  function resetForm() {
    setAppId("");
    setDate("");
    setTime("11:30 AM");
    setNotes("");
    setWaveTag("");
    setTargetCandidate(null);
  }

  function openScheduleForCandidate(app: AdminApplicationRow) {
    setTargetCandidate(app);
    setAppId(app.id);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    setDate(tomorrow);
    setWaveTag(app.wave_tag || `Wave-${new Date().getMonth() + 1}-${app.offer?.company?.split(" ")[0] || "Client"}`);
    setScheduleModalOpen(true);
  }

  function handleHubSelect(idx: number) {
    setSelectedHubIndex(idx);
    const hub = PRESET_HUBS[idx];
    if (hub) {
      setSiteName(hub.name);
      setSiteAddress(hub.address);
      setMapsLink(hub.mapsLink);
      setBusPoint(hub.busPoint);
      setBusTime(hub.busTime);
    }
  }

  function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appId || !date || !time) {
      toast.error("Please specify a candidate, date, and time");
      return;
    }

    scheduleMutation.mutate({
      data: {
        id: appId,
        interview_date: date,
        interview_time: time,
        interview_site: siteName,
        interview_address: siteAddress,
        interview_maps_link: mapsLink,
        interview_bus_point: busPoint,
        interview_bus_time: busTime,
        interview_notes: notes ? `${notes}${waveTag ? ` | Wave: ${waveTag}` : ""}` : (waveTag ? `Wave: ${waveTag}` : null),
        interview_attendance: "pending",
        status: "shortlisted",
      },
    });
  }

  const allApps = appsQuery.data ?? [];
  
  // Ready to be scheduled (shortlisted or new without interview date)
  const unscheduledShortlisted = allApps.filter(
    (a) => (a.status === "shortlisted" || a.status === "new") && !a.interview_date
  );

  // Scheduled interviews
  const scheduledApps = allApps.filter((a) => Boolean(a.interview_date));

  // Filter by attendance status if selected
  const filteredScheduled = scheduledApps.filter((a) => {
    if (filterAttendance === "all") return true;
    return (a.interview_attendance || "pending") === filterAttendance;
  });

  // Sort upcoming chronologically
  filteredScheduled.sort((a, b) => {
    const timeA = new Date(`${a.interview_date}T${a.interview_time || "12:00"}`).getTime();
    const timeB = new Date(`${b.interview_date}T${b.interview_time || "12:00"}`).getTime();
    return timeA - timeB;
  });

  function getGoogleCalendarUrl(app: AdminApplicationRow) {
    const d = (app.interview_date || "").replace(/-/g, "");
    const title = encodeURIComponent(`Interview: ${app.full_name} — ${app.offer?.title || "Role"}`);
    const details = encodeURIComponent(
      `Candidate: ${app.full_name}\nPhone: ${app.phone}\nRole: ${app.offer?.title} @ ${app.offer?.company}\nHub: ${app.interview_site || "TBD"}\nAddress: ${app.interview_address || "TBD"}\nBus: ${app.interview_bus_point || "None"}\nCandidate Pass: https://quickhire.eg/c/${app.id}`
    );
    const location = encodeURIComponent(app.interview_address || app.interview_site || "Cairo, Egypt");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${d}T100000Z/${d}T110000Z&details=${details}&location=${location}`;
  }

  function getWhatsAppInviteUrl(app: AdminApplicationRow) {
    const cleanPhone = (app.phone || "").replace(/[^0-9]/g, "");
    const dateFormatted = app.interview_date
      ? new Date(app.interview_date).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })
      : "الموعد المحدد";

    const msg =
      `أهلاً يا ${app.full_name.split(" ")[0]} 👋\n` +
      `معاك فريق توظيف QuickHire بخصوص تقديمك على وظيفة *${app.offer?.title || "الكول سنتر"}* في شركة *${app.offer?.company || "شركائنا"}*.\n\n` +
      `تم تحديد موعد المقابلة الشخصية:\n` +
      `📅 *اليوم:* ${dateFormatted}\n` +
      `⏰ *الساعة:* ${app.interview_time || "11:30 AM"}\n` +
      `🏢 *المكان:* ${app.interview_site || "المقر الرئيسي"}\n` +
      (app.interview_address ? `📍 *العنوان:* ${app.interview_address}\n` : "") +
      (app.interview_bus_point ? `🚌 *نقطة تحرك الباص المجاني:* ${app.interview_bus_point} (الساعة ${app.interview_bus_time || "صباحاً"})\n` : "") +
      `\n🔗 *تصريح الدخول واللوكيشن على الخريطة:* https://quickhire.eg/c/${app.id}\n\n` +
      `برجاء تأكيد الحضور بالرد على هذه الرسالة. بالتوفيق! 🚀`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 bg-background text-foreground">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono mb-2">
            <CalendarDays className="size-3.5" /> INTERVIEW OPERATIONS ENGINE
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
            Interview Management &amp; Client Waves
          </h1>
          <p className="mt-1 text-sm text-[#E4E4E7]/80">
            Real-time candidate scheduling, Egyptian BPO hub coordinates, and live attendance tracking.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setScheduleModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all cursor-pointer shrink-0"
        >
          <Plus className="size-4" /> Schedule New Interview
        </button>
      </div>

      {/* ── KPI STATS OVERVIEW ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Total Scheduled</span>
            <Calendar className="size-4 text-primary" />
          </div>
          <div className="font-display text-3xl font-extrabold text-white">
            {scheduledApps.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Active interview slots</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Confirmed Ready</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="font-display text-3xl font-extrabold text-emerald-400">
            {scheduledApps.filter((a) => a.interview_attendance === "confirmed").length}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">Confirmed via WhatsApp</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Attended &amp; Evaluated</span>
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="font-display text-3xl font-extrabold text-primary">
            {scheduledApps.filter((a) => a.interview_attendance === "attended").length}
          </div>
          <p className="text-[11px] text-primary/80 mt-1">Completed on-site</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Awaiting Scheduling</span>
            <AlertCircle className="size-4 text-amber-400" />
          </div>
          <div className="font-display text-3xl font-extrabold text-amber-400">
            {unscheduledShortlisted.length}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1">Shortlisted candidates ready</p>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: 2-COLUMN VIEW ── */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Shortlisted Pool Ready for Scheduling (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-surface-1 shadow-2xl overflow-hidden">
            <div className="border-b border-white/[0.08] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <span>Ready for Scheduling</span>
                  <span className="rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[11px] font-mono text-primary font-bold">
                    {unscheduledShortlisted.length}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Shortlisted &amp; qualified applicants</p>
              </div>
            </div>

            <div className="divide-y divide-white/[0.06] max-h-[580px] overflow-y-auto">
              {appsQuery.isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" /> Loading candidates…
                </div>
              ) : unscheduledShortlisted.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
                  <CheckCircle2 className="size-8 mx-auto text-primary/40" />
                  <p>All shortlisted candidates are currently scheduled!</p>
                </div>
              ) : (
                unscheduledShortlisted.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-surface-2 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{c.full_name}</span>
                        {c.total_score != null && (
                          <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                            {c.total_score}/30
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#E4E4E7]/70 truncate mt-0.5">
                        {c.offer?.title || "Sales Specialist"} · {c.offer?.company || "Hiring Partner"}
                      </div>
                    </div>

                    <button
                      onClick={() => openScheduleForCandidate(c)}
                      className="shrink-0 rounded-lg bg-primary/15 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      Book Slot
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Scheduled Interviews Dashboard (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-surface-1 shadow-2xl overflow-hidden">
            <div className="border-b border-white/[0.08] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <span>Scheduled Interview Waves</span>
                  <span className="rounded-full bg-surface-2 border border-white/10 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                    {filteredScheduled.length}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">Manage candidate arrivals, confirmations, and BPO passes</p>
              </div>

              {/* Attendance Filter Tabs */}
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 p-1 text-xs">
                {["all", "pending", "confirmed", "attended", "no_show"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterAttendance(st)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg capitalize transition-colors font-medium cursor-pointer",
                      filterAttendance === st
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {st === "all" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {filteredScheduled.length === 0 ? (
                <div className="p-16 text-center text-sm text-muted-foreground space-y-3">
                  <Calendar className="size-10 mx-auto text-muted-foreground/30" />
                  <p className="font-semibold text-white">No interviews found for this filter.</p>
                  <p className="text-xs text-muted-foreground">Select a candidate from the left panel to schedule their on-site interview.</p>
                </div>
              ) : (
                filteredScheduled.map((app) => {
                  const attendance = app.interview_attendance || "pending";

                  return (
                    <div key={app.id} className="p-5 md:p-6 hover:bg-surface-2/40 transition-colors space-y-4">
                      {/* Top Row: Candidate details & Status */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <Link
                              to="/admin/applicants/$id"
                              params={{ id: app.id }}
                              className="font-bold text-base text-white hover:text-primary transition-colors hover:underline"
                            >
                              {app.full_name}
                            </Link>
                            {app.wave_tag && (
                              <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-mono text-violet-300">
                                {app.wave_tag}
                              </span>
                            )}
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-bold border capitalize",
                                attendance === "attended"
                                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                                  : attendance === "confirmed"
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : attendance === "no_show"
                                  ? "border-red-500/30 bg-red-500/15 text-red-400"
                                  : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                              )}
                            >
                              {attendance.replace("_", " ")}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                            <span>Role: <strong className="text-zinc-200">{app.offer?.title}</strong></span>
                            <span>Client: <strong className="text-zinc-200">{app.offer?.company}</strong></span>
                            <span>Phone: <strong className="text-zinc-200 font-mono">{app.phone}</strong></span>
                          </div>
                        </div>

                        {/* Attendance Toggle Dropdown / Buttons */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground mr-1">Mark:</span>
                          <button
                            title="Mark Confirmed"
                            onClick={() => attendanceMutation.mutate({ data: { id: app.id, attendance: "confirmed" } })}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                              attendance === "confirmed"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-white/10 bg-surface-2 text-zinc-300 hover:border-primary/50"
                            )}
                          >
                            Confirmed
                          </button>
                          <button
                            title="Mark Attended"
                            onClick={() => attendanceMutation.mutate({ data: { id: app.id, attendance: "attended" } })}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                              attendance === "attended"
                                ? "bg-emerald-500 text-black border-emerald-500 font-bold"
                                : "border-white/10 bg-surface-2 text-zinc-300 hover:border-emerald-500/50"
                            )}
                          >
                            Attended ✓
                          </button>
                          <button
                            title="Mark No Show"
                            onClick={() => attendanceMutation.mutate({ data: { id: app.id, attendance: "no_show" } })}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                              attendance === "no_show"
                                ? "bg-red-500 text-white border-red-500 font-bold"
                                : "border-white/10 bg-surface-2 text-zinc-300 hover:border-red-500/50"
                            )}
                          >
                            No Show
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Schedule & Location Details Box */}
                      <div className="rounded-xl border border-white/[0.08] bg-surface-2/60 p-4 grid gap-3 sm:grid-cols-2 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <Clock className="size-3.5 text-primary" />
                            <span>
                              {app.interview_date
                                ? new Date(app.interview_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
                                : "Date TBD"}{" "}
                              at <strong className="text-primary">{app.interview_time || "11:30 AM"}</strong>
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-[#E4E4E7]/80">
                            <MapPin className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{app.interview_site || "Hub to be specified"}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {app.interview_bus_point && (
                            <div className="flex items-center gap-2 text-zinc-300">
                              <Bus className="size-3.5 text-blue-400 shrink-0" />
                              <span>Bus Pickup: <strong>{app.interview_bus_point}</strong> ({app.interview_bus_time || "Morning"})</span>
                            </div>
                          )}
                          {app.interview_address && (
                            <div className="flex items-center gap-2 text-muted-foreground truncate">
                              <Navigation className="size-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{app.interview_address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: 1-Click Operational Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* WhatsApp Invite Button */}
                          <a
                            href={getWhatsAppInviteUrl(app)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#20ba59] transition-all cursor-pointer"
                          >
                            <MessageCircle className="size-3.5" /> Send WhatsApp Pass &amp; Directions
                          </a>

                          {/* Google Calendar Link */}
                          <a
                            href={getGoogleCalendarUrl(app)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-medium text-white hover:bg-surface-3 transition-colors"
                          >
                            <Calendar className="size-3.5 text-primary" /> Google Calendar
                          </a>

                          {/* Candidate Pass Link */}
                          <Link
                            to="/c/$id"
                            params={{ id: app.id }}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors"
                          >
                            <ExternalLink className="size-3" /> Candidate Pass (/c/{app.id.slice(0, 7)})
                          </Link>

                          {/* Wave Tag Roster Link */}
                          {app.wave_tag && (
                            <Link
                              to="/wave/$waveTag"
                              params={{ waveTag: app.wave_tag }}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition-colors"
                            >
                              <span>Wave Roster</span>
                            </Link>
                          )}
                        </div>

                        {/* Re-schedule button */}
                        <button
                          onClick={() => openScheduleForCandidate(app)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors underline cursor-pointer"
                        >
                          Edit Location &amp; Time
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCHEDULE INTERVIEW MODAL ── */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-surface-1 p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Schedule BPO Interview &amp; Assign Wave
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stores date, hub coordinates, and sends directions to the candidate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-muted-foreground hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              {/* Candidate Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Select Candidate <span className="text-primary">*</span>
                </label>
                <select
                  required
                  value={appId}
                  onChange={(e) => {
                    setAppId(e.target.value);
                    const found = allApps.find((a) => a.id === e.target.value);
                    if (found) setTargetCandidate(found);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— Choose candidate —</option>
                  {allApps.map((a) => (
                    <option key={a.id} value={a.id} className="bg-surface-1">
                      {a.full_name} — {a.offer?.title || "Role"} ({a.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Interview Date <span className="text-primary">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Interview Time <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="11:30 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Egyptian BPO Hub Preset Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Select BPO Hub Location
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_HUBS.map((hub, idx) => (
                    <button
                      type="button"
                      key={hub.name}
                      onClick={() => handleHubSelect(idx)}
                      className={cn(
                        "text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between",
                        selectedHubIndex === idx
                          ? "border-primary bg-primary/10 text-white font-semibold"
                          : "border-white/10 bg-surface-2 text-zinc-400 hover:text-white hover:bg-surface-3"
                      )}
                    >
                      <div className="truncate">
                        <span className="font-bold text-white block">{hub.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate">{hub.address}</span>
                      </div>
                      {selectedHubIndex === idx && <Check className="size-4 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wave Tag & Bus Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Wave Identifier Tag
                  </label>
                  <input
                    type="text"
                    placeholder="Wave-3-Concentrix"
                    value={waveTag}
                    onChange={(e) => setWaveTag(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Bus Pickup Station
                  </label>
                  <input
                    type="text"
                    placeholder="Lebanon Square"
                    value={busPoint}
                    onChange={(e) => setBusPoint(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all cursor-pointer disabled:opacity-60"
                >
                  {scheduleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
                  <span>Save &amp; Confirm Interview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-surface-2 px-5 py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
