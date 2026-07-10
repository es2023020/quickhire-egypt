import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getOfferBySlug } from "@/lib/offers.functions";
import { submitApplication } from "@/lib/applications.functions";
import { createUploadUrl } from "@/lib/uploads.functions";
import { VoiceRecorder } from "@/components/voice-recorder";
import { supabase } from "@/integrations/supabase/client";

const offerQO = (slug: string) =>
  queryOptions({
    queryKey: ["offer", slug],
    queryFn: () => getOfferBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/offers/$slug/apply")({
  loader: async ({ context, params }) => {
    const offer = await context.queryClient.ensureQueryData(offerQO(params.slug));
    if (!offer) throw notFound();
    return { offer };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Apply — ${loaderData.offer.title}` : "Apply" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyPage,
});

async function uploadFile(bucket: "cvs" | "voice-notes", file: Blob, filename: string) {
  const signed = await createUploadUrl({ data: { bucket, filename } });
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw new Error(error.message);
  return signed.path;
}

function ApplyPage() {
  const { slug } = Route.useParams();
  const { data: offer } = useSuspenseQuery(offerQO(slug));
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [gradStatus, setGradStatus] = useState("");
  const [englishLevel, setEnglishLevel] = useState("");
  const [experience, setExperience] = useState("");
  const [salaryExp, setSalaryExp] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [voiceBlobs, setVoiceBlobs] = useState<Record<string, Blob | null>>({});

  if (!offer) return null;
  const voiceReqs = offer.form_schema?.voice_notes ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offer) return;
    if (!cvFile) return toast.error("Please upload your CV (PDF)");
    for (const v of voiceReqs) {
      if (!voiceBlobs[v.lang]) return toast.error(`Please record your ${v.lang} voice note`);
    }
    setSubmitting(true);
    try {
      const cvPath = await uploadFile("cvs", cvFile, cvFile.name);
      const voiceNotes: { lang: string; path: string }[] = [];
      for (const v of voiceReqs) {
        const blob = voiceBlobs[v.lang]!;
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const path = await uploadFile("voice-notes", blob, `${v.lang.toLowerCase()}.${ext}`);
        voiceNotes.push({ lang: v.lang, path });
      }
      await submitApplication({
        data: {
          offer_id: offer.id,
          full_name: fullName,
          email,
          phone,
          age: age ? Number(age) : null,
          location: location || null,
          grad_status: gradStatus || null,
          english_level: englishLevel || null,
          experience_years: experience ? Number(experience) : null,
          salary_expectation: salaryExp || null,
          answers: {},
          cv_path: cvPath,
          voice_notes: voiceNotes,
        },
      });
      setDone(true);
      toast.success("Application submitted — we'll be in touch");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-success/15 text-success shadow-soft">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl">You're in.</h1>
        <p className="mt-3 text-muted-foreground">
          Your application for <b>{offer.title}</b> was submitted. Our AI is scoring it now — shortlisted candidates
          hear back from HR within 48 hours on the phone number you provided.
        </p>
        <div className="mt-6 flex gap-2">
          <Link to="/offers" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Browse more jobs</Link>
          <Link to="/prep" className="rounded-md border border-input px-4 py-2 text-sm font-medium">Prep for the interview</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-6">
        <Link to="/offers/$slug" params={{ slug }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to job
        </Link>
        <h1 className="mt-3 font-display text-3xl md:text-4xl">Apply · {offer.title}</h1>
        <p className="mt-2 text-muted-foreground">
          Takes about 5 minutes. Your details are private until you're shortlisted.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl">Your details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Full name" required value={fullName} onChange={setFullName} />
            <Field label="Email" type="email" required value={email} onChange={setEmail} />
            <Field label="Phone (WhatsApp)" required value={phone} onChange={setPhone} placeholder="+20..." />
            <Field label="Age" type="number" value={age} onChange={setAge} />
            <Field label="City" value={location} onChange={setLocation} placeholder="Cairo, Alexandria…" />
            <Select label="Graduation status" value={gradStatus} onChange={setGradStatus} options={["", "Student", "Graduate", "Not a graduate"]} />
            <Select label="English level" value={englishLevel} onChange={setEnglishLevel} options={["", "A1", "A2", "B1", "B2", "C1", "C2"]} />
            <Field label="Experience (years)" type="number" value={experience} onChange={setExperience} />
            <Field label="Salary expectation (EGP)" value={salaryExp} onChange={setSalaryExp} placeholder="e.g. 15000" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl">Upload your CV</h2>
          <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, up to 10MB.</p>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-sand p-4 hover:border-primary">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Upload className="size-4" />
            </div>
            <div className="flex-1 text-sm">
              {cvFile ? <span className="font-medium">{cvFile.name}</span> : <span className="text-muted-foreground">Choose file…</span>}
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </section>

        {voiceReqs.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl">Voice notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Record clearly. This is what HR will hear when you get shortlisted.
              </p>
            </div>
            {voiceReqs.map((v) => (
              <VoiceRecorder
                key={v.lang}
                lang={v.lang}
                prompt={v.prompt}
                required
                onChange={(b) => setVoiceBlobs((prev) => ({ ...prev, [v.lang]: b }))}
              />
            ))}
          </section>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Submit application
        </button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
      </select>
    </label>
  );
}
