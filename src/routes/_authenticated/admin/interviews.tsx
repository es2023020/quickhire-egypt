import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays, Loader2, MessageCircle, Mail, ExternalLink,
  Clock, MapPin, Phone, Plus, Calendar,
} from "lucide-react";
import { adminListApplications } from "@/lib/applications.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/interviews")({
  head: () => ({ meta: [{ title: "Interviews — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: Interviews,
});

type InterviewEntry = {
  appId: string;
  candidateName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  date: string;
  time: string;
  type: "phone" | "video" | "in-person";
  notes: string;
};

function Interviews() {
  const apps = useQuery({
    queryKey: ["admin", "applications", "all", "shortlisted"],
    queryFn: () => adminListApplications({ data: { status: "shortlisted" } }),
  });

  const [interviews, setInterviews] = useState<InterviewEntry[]>([]);
  const [form, setForm] = useState<Partial<InterviewEntry> | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>("");

  const shortlisted = apps.data ?? [];

  function scheduleInterview() {
    if (!form?.appId || !form.date || !form.time) return;
    const app = shortlisted.find(a => a.id === form.appId);
    if (!app) return;
    const entry: InterviewEntry = {
      appId: form.appId,
      candidateName: app.full_name,
      email: app.email,
      phone: app.phone,
      role: app.offer?.title ?? "—",
      company: app.offer?.company ?? "—",
      date: form.date!,
      time: form.time!,
      type: form.type ?? "phone",
      notes: form.notes ?? "",
    };
    setInterviews(prev => [...prev, entry]);
    setForm(null);
    setSelectedApp("");
  }

  function calendarUrl(i: InterviewEntry) {
    const dt = `${i.date.replace(/-/g, "")}T${i.time.replace(/:/g, "")}00`;
    const end = dt.replace(/T(\d{2})(\d{2})/, (_, h, m) => {
      const nh = (Number(h) + 1).toString().padStart(2, "0");
      return `T${nh}${m}`;
    });
    const title = encodeURIComponent(`Interview: ${i.candidateName} — ${i.role}`);
    const details = encodeURIComponent(`Candidate: ${i.candidateName}\nRole: ${i.role} @ ${i.company}\nPhone: ${i.phone}\nType: ${i.type} interview\n\nNotes: ${i.notes}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dt}/${end}&details=${details}`;
  }

  function waInterviewMsg(i: InterviewEntry) {
    return `Hi ${i.candidateName}! This is QuickHire. Your interview for the ${i.role} position at ${i.company} is scheduled for ${new Date(i.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at ${i.time}. Type: ${i.type}. Please confirm receipt. 🎯`;
  }

  const upcoming = interviews.filter(i => new Date(`${i.date}T${i.time}`) >= new Date()).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  const past = interviews.filter(i => new Date(`${i.date}T${i.time}`) < new Date());

  return (
    <div className="px-6 py-8 max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <CalendarDays className="size-7 text-primary" /> Interview Scheduling
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {shortlisted.length} shortlisted candidates · {upcoming.length} upcoming interviews
          </p>
        </div>
        <button
          onClick={() => setForm({})}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="size-4" /> Schedule interview
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shortlisted candidates */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-bold">Shortlisted Candidates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ready to be interviewed</p>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {apps.isLoading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : shortlisted.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No shortlisted candidates yet.<br />
                  <Link to="/admin/applicants" className="text-primary hover:underline">Shortlist candidates →</Link>
                </div>
              ) : shortlisted.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50 transition-colors">
                  <div className="size-8 shrink-0 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {a.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{a.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.offer?.title}</div>
                  </div>
                  <button
                    onClick={() => setForm({ appId: a.id })}
                    className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    Schedule
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming interviews */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-bold">Upcoming Interviews</h2>
            </div>
            <div className="divide-y divide-border">
              {upcoming.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No interviews scheduled. Schedule your first one from the shortlisted candidates list.
                </div>
              ) : upcoming.map((i, idx) => (
                <div key={idx} className="px-5 py-4 hover:bg-sand/40 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          i.type === "phone" ? "bg-blue-100 text-blue-700" :
                          i.type === "video" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700",
                        )}>
                          {i.type === "phone" ? "📞 Phone" : i.type === "video" ? "💻 Video" : "🏢 In-person"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(`${i.date}T${i.time}`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {i.time}
                        </span>
                      </div>
                      <div className="font-semibold text-ink">{i.candidateName}</div>
                      <div className="text-sm text-muted-foreground">{i.role} · {i.company}</div>
                      {i.notes && <div className="mt-1 text-xs text-muted-foreground italic">{i.notes}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={calendarUrl(i)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-sand transition-colors"
                        title="Add to Google Calendar"
                      >
                        <Calendar className="size-3.5" /> Calendar
                      </a>
                      <a
                        href={`https://wa.me/${i.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waInterviewMsg(i))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                        title="Send WhatsApp reminder"
                      >
                        <MessageCircle className="size-3.5" />
                      </a>
                      <a
                        href={`mailto:${i.email}?subject=${encodeURIComponent(`Interview confirmation — ${i.role}`)}&body=${encodeURIComponent(`Hi ${i.candidateName},\n\nThis is a confirmation for your interview for the ${i.role} position at ${i.company}.\n\nDate: ${new Date(`${i.date}T${i.time}`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}\nTime: ${i.time}\nType: ${i.type} interview\n\nBest regards,\nQuickHire Recruitment Team`)}`}
                        className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        title="Send email confirmation"
                      >
                        <Mail className="size-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {past.length > 0 && (
            <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-display text-base font-bold text-muted-foreground">Past Interviews ({past.length})</h2>
              </div>
              <div className="divide-y divide-border">
                {past.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-5 py-3 opacity-60">
                    <div className="text-xs text-muted-foreground">
                      {new Date(`${i.date}T${i.time}`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {i.time}
                    </div>
                    <div className="flex-1 text-sm">{i.candidateName} · {i.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule interview modal */}
      {form !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="font-display text-xl font-bold mb-5">Schedule Interview</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate</span>
                <select
                  value={form.appId ?? ""}
                  onChange={e => setForm(p => ({ ...p, appId: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Select candidate —</option>
                  {shortlisted.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name} — {a.offer?.title}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
                  <input
                    type="date"
                    value={form.date ?? ""}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</span>
                  <input
                    type="time"
                    value={form.time ?? ""}
                    onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interview type</span>
                <select
                  value={form.type ?? "phone"}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value as "phone" | "video" | "in-person" }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="phone">📞 Phone call</option>
                  <option value="video">💻 Video call</option>
                  <option value="in-person">🏢 In-person</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</span>
                <textarea
                  value={form.notes ?? ""}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Interview location, video link, topics to cover…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={scheduleInterview}
                disabled={!form.appId || !form.date || !form.time}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-60"
              >
                <Calendar className="size-4" /> Schedule
              </button>
              <button
                onClick={() => setForm(null)}
                className="rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-sand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
