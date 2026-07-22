import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Briefcase, Loader2, Star, Plus, Edit2, Trash2, X, Save,
  Eye, EyeOff, ChevronDown, ChevronUp, Search, ExternalLink, Pause,
} from "lucide-react";
import { toast } from "sonner";
import { adminListOffers, upsertOffer, deleteOffer } from "@/lib/offers.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({ meta: [{ title: "Offers — QuickHire Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminOffers,
});

const CATEGORIES = [
  "Sales Representative", "Property Consultant", "Cold Caller", "SDR",
  "Telemarketer", "Customer Service Representative", "Call Center Agent",
  "Telesales", "Account Executive", "Business Development Representative",
];

const SHIFTS = ["Morning", "Evening", "Night", "Rotating", "Flexible", "Remote"];
const LOCATIONS = ["Cairo", "Alexandria", "Giza", "Heliopolis", "New Cairo", "6th of October", "Remote", "Hybrid"];

type OfferForm = {
  id?: string;
  slug: string; title: string; company: string; category: string;
  language: string; salary_text: string; salary_min: string;
  location: string; shift_type: string; summary: string;
  description: string; requirements: string; benefits: string;
  hr_phone: string; status: "active" | "archived" | "on_hold"; featured: boolean;
  voice_note_lang: string; voice_note_prompt: string;
};

const EMPTY_FORM: OfferForm = {
  slug: "", title: "", company: "", category: CATEGORIES[0],
  language: "", salary_text: "", salary_min: "",
  location: LOCATIONS[0], shift_type: SHIFTS[0], summary: "",
  description: "", requirements: "", benefits: "",
  hr_phone: "", status: "active", featured: false,
  voice_note_lang: "English", voice_note_prompt: "Introduce yourself briefly in English and explain why you're a great fit for this role.",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function AdminOffers() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OfferForm | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: () => adminListOffers(),
  });

  const save = useMutation({
    mutationFn: (f: OfferForm) => upsertOffer({
      data: {
        id: f.id,
        slug: f.slug,
        title: f.title,
        company: f.company,
        category: f.category,
        language: f.language || null,
        salary_text: f.salary_text,
        salary_min: f.salary_min ? Number(f.salary_min) : null,
        location: f.location,
        shift_type: f.shift_type || null,
        summary: f.summary,
        description: f.description,
        requirements: f.requirements.split("\n").map(s => s.trim()).filter(Boolean),
        benefits: f.benefits.split("\n").map(s => s.trim()).filter(Boolean),
        form_schema: f.voice_note_lang && f.voice_note_prompt
          ? { voice_notes: [{ lang: f.voice_note_lang, prompt: f.voice_note_prompt }] }
          : {},
        hr_phone: f.hr_phone || null,
        status: f.status,
        featured: f.featured,
      },
    }),
    onSuccess: () => {
      toast.success("Offer saved");
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["offers", "public"] });
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteOffer({ data: { id } }),
    onSuccess: () => {
      toast.success("Offer deleted");
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["offers", "public"] });
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ status: "active" | "archived" | "on_hold"; featured: boolean }> }) => {
      const existing = data?.find((x) => x.id === id);
      if (!existing) throw new Error("Not found");
      return upsertOffer({
        data: {
          id: existing.id, slug: existing.slug, title: existing.title,
          company: existing.company, category: existing.category,
          language: existing.language, salary_text: existing.salary_text,
          salary_min: existing.salary_min, location: existing.location,
          shift_type: existing.shift_type, summary: existing.summary,
          description: existing.description,
          requirements: existing.requirements ?? [],
          benefits: existing.benefits ?? [],
          form_schema: existing.form_schema ?? {},
          hr_phone: existing.hr_phone,
          status: (patch.status ?? existing.status) as "active" | "archived" | "on_hold",
          featured: patch.featured ?? existing.featured,
        },
      });
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["offers", "public"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function startEdit(o?: typeof data extends (infer T)[] | undefined ? T : never) {
    if (o) {
      const vn = o.form_schema?.voice_notes?.[0];
      setEditing({
        id: o.id, slug: o.slug, title: o.title, company: o.company,
        category: o.category, language: o.language ?? "",
        salary_text: o.salary_text, salary_min: o.salary_min?.toString() ?? "",
        location: o.location, shift_type: o.shift_type ?? SHIFTS[0],
        summary: o.summary, description: o.description,
        requirements: (o.requirements ?? []).join("\n"),
        benefits: (o.benefits ?? []).join("\n"),
        hr_phone: o.hr_phone ?? "", status: o.status as "active" | "archived" | "on_hold",
        featured: o.featured,
        voice_note_lang: vn?.lang ?? "English",
        voice_note_prompt: vn?.prompt ?? EMPTY_FORM.voice_note_prompt,
      });
    } else {
      setEditing({ ...EMPTY_FORM });
    }
  }

  const filtered = (data ?? []).filter(o => {
    if (!showArchived && o.status === "archived") return false;
    if (search) {
      const q = search.toLowerCase();
      return o.title.toLowerCase().includes(q) || o.company.toLowerCase().includes(q) || o.category.toLowerCase().includes(q);
    }
    return true;
  });

  const active = (data ?? []).filter(o => o.status === "active").length;
  const onHold = (data ?? []).filter(o => o.status === "on_hold").length;
  const archived = (data ?? []).filter(o => o.status === "archived").length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <Briefcase className="size-7 text-primary" /> Job Offers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active} active · {onHold} on hold · {archived} archived
          </p>
        </div>
        <button
          onClick={() => startEdit()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> New offer
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search offers…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring shadow-soft"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
          Show archived
        </label>
      </div>

      {/* Offers table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="flex items-center justify-center p-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            No offers found. <button onClick={() => startEdit()} className="text-primary hover:underline">Create your first offer →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-sand/40 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.company}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {o.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{o.location}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink">{o.salary_text}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle.mutate({ id: o.id, patch: { status: o.status === "active" ? "on_hold" : o.status === "on_hold" ? "archived" : "active" } })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                          o.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                          o.status === "on_hold" ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                          "bg-sand text-muted-foreground hover:bg-sand-deep"
                        )}
                      >
                        {o.status === "active" ? <Eye className="size-3" /> :
                         o.status === "on_hold" ? <Pause className="size-3" /> :
                         <EyeOff className="size-3" />}
                        {o.status === "active" ? "Active" :
                         o.status === "on_hold" ? "On Hold" :
                         "Archived"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle.mutate({ id: o.id, patch: { featured: !o.featured } })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                          o.featured
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-sand text-muted-foreground hover:bg-sand-deep",
                        )}
                      >
                        <Star className={cn("size-3", o.featured && "fill-amber-500")} />
                        {o.featured ? "Featured" : "—"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/offers/${o.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="grid size-7 place-items-center rounded-lg bg-sand text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="View public listing"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                        <button
                          onClick={() => startEdit(o)}
                          className="grid size-7 place-items-center rounded-lg bg-sand text-muted-foreground hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(o.id)}
                          className="grid size-7 place-items-center rounded-lg bg-sand text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Delete"
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
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lift max-w-sm w-full mx-4">
            <h3 className="font-display text-xl mb-2">Delete offer?</h3>
            <p className="text-sm text-muted-foreground mb-5">This will permanently remove the listing and cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => del.mutate(confirmDelete)}
                disabled={del.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {del.isPending && <Loader2 className="size-4 animate-spin" />} Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-sand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-lift overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h2 className="font-display text-xl font-bold">
                {editing.id ? "Edit offer" : "Create new offer"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 hover:bg-sand transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 px-6 py-6 space-y-5">
              {/* Basic info */}
              <Section title="Basic Information">
                <FormField label="Job title *" value={editing.title} onChange={v => {
                  setEditing(prev => prev ? { ...prev, title: v, slug: prev.id ? prev.slug : slugify(v) } : prev);
                }} placeholder="Senior Sales Representative" />
                <FormField label="Company *" value={editing.company} onChange={v => setEditing(p => p ? { ...p, company: v } : p)} />
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect label="Category *" value={editing.category} onChange={v => setEditing(p => p ? { ...p, category: v } : p)} options={CATEGORIES} />
                  <FormField label="Language requirement" value={editing.language} onChange={v => setEditing(p => p ? { ...p, language: v } : p)} placeholder="e.g. English, Arabic" />
                </div>
                <FormField label="URL slug *" value={editing.slug} onChange={v => setEditing(p => p ? { ...p, slug: slugify(v) } : p)} placeholder="senior-sales-rep" />
              </Section>

              {/* Location & Compensation */}
              <Section title="Location & Compensation">
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect label="Location *" value={editing.location} onChange={v => setEditing(p => p ? { ...p, location: v } : p)} options={LOCATIONS} />
                  <FormSelect label="Shift type" value={editing.shift_type} onChange={v => setEditing(p => p ? { ...p, shift_type: v } : p)} options={SHIFTS} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Salary (display) *" value={editing.salary_text} onChange={v => setEditing(p => p ? { ...p, salary_text: v } : p)} placeholder="e.g. 10,000 – 15,000 EGP/mo" />
                  <FormField label="Salary min (EGP)" type="number" value={editing.salary_min} onChange={v => setEditing(p => p ? { ...p, salary_min: v } : p)} placeholder="10000" />
                </div>
                <FormField label="HR WhatsApp / Phone" value={editing.hr_phone} onChange={v => setEditing(p => p ? { ...p, hr_phone: v } : p)} placeholder="+20 10 0000 0000" />
              </Section>

              {/* Description */}
              <Section title="Listing Content">
                <FormField label="Summary (1–2 sentences) *" value={editing.summary} onChange={v => setEditing(p => p ? { ...p, summary: v } : p)} placeholder="We're looking for a driven sales rep…" />
                <FormTextArea label="Full description *" value={editing.description} onChange={v => setEditing(p => p ? { ...p, description: v } : p)} rows={5} placeholder="Describe the role, team, and day-to-day responsibilities…" />
                <FormTextArea label="Requirements (one per line)" value={editing.requirements} onChange={v => setEditing(p => p ? { ...p, requirements: v } : p)} rows={4} placeholder={"2+ years sales experience\nFluent English\nCairo based"} />
                <FormTextArea label="Benefits (one per line)" value={editing.benefits} onChange={v => setEditing(p => p ? { ...p, benefits: v } : p)} rows={3} placeholder={"Competitive commission\nHealth insurance\nRemote flexibility"} />
              </Section>

              {/* Voice note */}
              <Section title="Voice Note Settings">
                <FormField label="Language" value={editing.voice_note_lang} onChange={v => setEditing(p => p ? { ...p, voice_note_lang: v } : p)} placeholder="English" />
                <FormTextArea label="Recording prompt" value={editing.voice_note_prompt} onChange={v => setEditing(p => p ? { ...p, voice_note_prompt: v } : p)} rows={2} placeholder="What should candidates say?" />
              </Section>

              {/* Settings */}
              <Section title="Settings">
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect label="Status" value={editing.status} onChange={v => setEditing(p => p ? { ...p, status: v as "active" | "archived" | "on_hold" } : p)} options={["active", "archived", "on_hold"]} />
                  <label className="flex items-center gap-2 cursor-pointer mt-6">
                    <input
                      type="checkbox"
                      checked={editing.featured}
                      onChange={e => setEditing(p => p ? { ...p, featured: e.target.checked } : p)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Featured on homepage</span>
                  </label>
                </div>
              </Section>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-card px-6 py-4 flex gap-3">
              <button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.title || !editing.company || !editing.slug}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-60"
              >
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {editing.id ? "Save changes" : "Create offer"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-xl border border-border px-5 py-3 text-sm font-medium hover:bg-sand"
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function FormTextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
      />
    </label>
  );
}
