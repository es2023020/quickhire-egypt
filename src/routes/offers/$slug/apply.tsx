import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Loader2, Upload, Info, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { getOfferBySlug } from "@/lib/offers.functions";
import { submitApplication } from "@/lib/applications.functions";
import { createUploadUrl } from "@/lib/uploads.functions";
import { VoiceRecorder } from "@/components/voice-recorder";
import { supabase } from "@/integrations/supabase/client";

const QUICKHIRE_WA = "201029324783";
const QUICKHIRE_EMAIL = "hello@quickhire.eg";

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

const ROLE_SPECIFIC_QUESTIONS: Record<string, { label: string; type?: string; options?: string[] }[]> = {
  "Sales Representative": [
    { label: "Do you have your own vehicle or reliable transport?", options: ["Yes", "No"] },
    { label: "What is your typical monthly sales target (EGP)?", type: "text" },
    { label: "How many years in direct sales?" , type: "number" },
  ],
  "Cold Caller": [
    { label: "How many outbound calls can you handle per day?", type: "number" },
    { label: "Do you have experience with any CRM tools?", options: ["Yes – Salesforce", "Yes – HubSpot", "Yes – Other", "No"] },
  ],
  "SDR": [
    { label: "Experience with LinkedIn Sales Navigator?", options: ["Yes", "No", "Learning"] },
    { label: "Can you write cold outreach emails in English?", options: ["Yes – fluently", "Yes – with some help", "No"] },
  ],
  "Customer Service Representative": [
    { label: "Have you handled inbound support tickets before?", options: ["Yes", "No"] },
    { label: "What is your average handle time (AHT) in minutes?", type: "number" },
  ],
  "Call Center Agent": [
    { label: "Do you have a quiet home environment for remote work?", options: ["Yes", "No", "I prefer office"] },
    { label: "Are you comfortable with night/rotating shifts?", options: ["Yes", "Day shifts only", "Flexible"] },
  ],
  "Telemarketer": [
    { label: "Are you comfortable with rejection and high call volumes?", options: ["Yes", "I am building that skill"] },
  ],
  "Account Executive": [
    { label: "Largest deal you have closed (EGP)?", type: "text" },
    { label: "Do you have enterprise B2B experience?", options: ["Yes", "SMB only", "No"] },
  ],
  "Property Consultant": [
    { label: "Do you hold a real estate license or certification?", options: ["Yes", "No", "In progress"] },
    { label: "Which areas/developments are you most familiar with?", type: "text" },
  ],
  "Telesales": [
    { label: "Have you done telesales for financial products?", options: ["Yes", "No"] },
    { label: "Can you commit to a monthly sales quota?", options: ["Yes", "Need more details", "No"] },
  ],
  "Business Development Representative": [
    { label: "Do you have experience generating your own leads?", options: ["Yes", "Partially", "No"] },
    { label: "Comfortable working independently with minimal supervision?", options: ["Yes", "Prefer some guidance", "No"] },
  ],
};

function getRoleQuestions(category: string) {
  const key = Object.keys(ROLE_SPECIFIC_QUESTIONS).find(k =>
    category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(category.toLowerCase())
  );
  return key ? ROLE_SPECIFIC_QUESTIONS[key] : [];
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

  // New questions
  const [workedBefore, setWorkedBefore] = useState("");
  const [hasContract, setHasContract] = useState("");
  const [contactedHR, setContactedHR] = useState("");
  const [roleAnswers, setRoleAnswers] = useState<Record<string, string>>({});

  if (!offer) return null;
  const voiceReqs = offer.form_schema?.voice_notes ?? [];
  const roleQuestions = getRoleQuestions(offer.category);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offer) return;
    if (!cvFile) return toast.error("Please upload your CV (PDF or DOCX)");
    for (const v of voiceReqs) {
      if (!voiceBlobs[v.lang]) return toast.error(`Please provide your ${v.lang} voice note (record or upload)`);
    }
    setSubmitting(true);
    try {
      const cvPath = await uploadFile("cvs", cvFile, cvFile.name);
      const voiceNotes: { lang: string; path: string }[] = [];
      for (const v of voiceReqs) {
        const blob = voiceBlobs[v.lang]!;
        const ext = blob.type.includes("mp4") || blob.type.includes("m4a") ? "m4a"
          : blob.type.includes("mp3") || blob.type.includes("mpeg") ? "mp3"
          : blob.type.includes("wav") ? "wav"
          : "webm";
        const path = await uploadFile("voice-notes", blob, `${v.lang.toLowerCase()}.${ext}`);
        voiceNotes.push({ lang: v.lang, path });
      }

      const answers: Record<string, string> = {
        worked_before_at_company: workedBefore,
        has_contract_or_resigned: hasContract,
        contacted_hr_before: contactedHR,
        ...roleAnswers,
      };

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
          answers,
          cv_path: cvPath,
          voice_notes: voiceNotes,
        },
      });
      setDone(true);
      toast.success("Application submitted — we'll be in touch!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const waText = encodeURIComponent(
      `Hi QuickHire! I just submitted my application for *${offer.title}* at *${offer.company}*.\nMy name is ${fullName} and my WhatsApp is ${phone}. Please confirm you received it. Thank you!`
    );
    const mailSubject = encodeURIComponent(`Application Confirmation — ${offer.title} at ${offer.company}`);
    const mailBody = encodeURIComponent(
      `Hi QuickHire,\n\nI just submitted my application for ${offer.title} at ${offer.company}.\n\nMy details:\n- Name: ${fullName}\n- Phone: ${phone}\n- Email: ${email}\n\nPlease confirm receipt.\n\nThank you!`
    );

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-success/15 text-success shadow-lift">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-6 font-display text-4xl">You're in!</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-sm">
          Your application for <b>{offer.title}</b> is submitted. Our AI is scoring it now —
          shortlisted candidates hear from HR within <b>24–48 hours</b> on the phone number you provided.
        </p>

        <div className="mt-5 w-full rounded-2xl border border-primary/15 bg-primary/5 p-5 text-left">
          <p className="text-sm font-semibold text-primary mb-3">📲 Confirm your application</p>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Tap below to send us a quick confirmation on WhatsApp or email — this guarantees we have your contact details correct.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a
              href={`https://wa.me/${QUICKHIRE_WA}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="size-4" />
              Confirm on WhatsApp
            </a>
            <a
              href={`mailto:${QUICKHIRE_EMAIL}?subject=${mailSubject}&body=${mailBody}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-sand transition-colors"
            >
              <Mail className="size-4" />
              Confirm by Email
            </a>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-700 text-left w-full">
          📱 Keep WhatsApp open on <b>{phone || "the number you provided"}</b> — HR will reach out within 24–48 hrs.
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/offers" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">Browse more jobs</Link>
          <Link to="/prep" className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-sand">Interview prep</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      {/* Header */}
      <div className="mb-8">
        <Link to="/offers/$slug" params={{ slug }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          ← Back to job listing
        </Link>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Apply · {offer.title}</h1>
        <div className="mt-1 text-muted-foreground">{offer.company} · {offer.location}</div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-sm text-primary">
          <Info className="size-4" />
          Takes about 5 minutes. Your details stay private until you're shortlisted.
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Personal Details */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl mb-4">Your details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" required value={fullName} onChange={setFullName} placeholder="Mohamed Ahmed" />
            <Field label="Email address" type="email" required value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="WhatsApp number" required value={phone} onChange={setPhone} placeholder="+20 10 0000 0000" />
            <Field label="Age" type="number" value={age} onChange={setAge} placeholder="e.g. 24" />
            <Field label="City" value={location} onChange={setLocation} placeholder="Cairo, Alexandria, Giza…" />
            <Select label="Graduation status" value={gradStatus} onChange={setGradStatus}
              options={["", "Currently enrolled", "Graduate", "Post-graduate", "Not a graduate"]} />
            <Select label="English level" value={englishLevel} onChange={setEnglishLevel}
              options={["", "A1 – Beginner", "A2 – Elementary", "B1 – Intermediate", "B2 – Upper Intermediate", "C1 – Advanced", "C2 – Proficient / Native"]} />
            <Field label="Years of experience" type="number" value={experience} onChange={setExperience} placeholder="0" />
            <Field label="Salary expectation (EGP/month)" value={salaryExp} onChange={setSalaryExp} placeholder="e.g. 12000" className="md:col-span-2" />
          </div>
        </section>

        {/* Company-specific questions */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl mb-1">A few quick questions</h2>
          <p className="text-sm text-muted-foreground mb-5">Please answer honestly — this helps us match you accurately.</p>
          <div className="space-y-4">
            <Select
              label={`Have you worked at ${offer.company} before?`}
              value={workedBefore}
              onChange={setWorkedBefore}
              options={["", "Yes – full time", "Yes – part time / freelance", "No"]}
            />
            <Select
              label="Do you currently have a contract or are you in a notice period?"
              value={hasContract}
              onChange={setHasContract}
              options={["", "Yes – I have an active contract", "I'm in my notice period", "No – I'm currently free to join", "I was recently made redundant"]}
            />
            <Select
              label={`Have you previously contacted any HR at ${offer.company}?`}
              value={contactedHR}
              onChange={setContactedHR}
              options={["", "Yes – they reached out to me", "Yes – I reached out to them", "No"]}
            />
          </div>
        </section>

        {/* Role-specific questions */}
        {roleQuestions.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl mb-1">Role-specific questions</h2>
            <p className="text-sm text-muted-foreground mb-5">These help us assess your fit for <b>{offer.category}</b> roles.</p>
            <div className="space-y-4">
              {roleQuestions.map((q) => (
                <div key={q.label}>
                  {q.options ? (
                    <Select
                      label={q.label}
                      value={roleAnswers[q.label] ?? ""}
                      onChange={(v) => setRoleAnswers(prev => ({ ...prev, [q.label]: v }))}
                      options={["", ...q.options]}
                    />
                  ) : (
                    <Field
                      label={q.label}
                      type={q.type ?? "text"}
                      value={roleAnswers[q.label] ?? ""}
                      onChange={(v) => setRoleAnswers(prev => ({ ...prev, [q.label]: v }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CV Upload */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl mb-1">Upload your CV</h2>
          <p className="mt-1 text-sm text-muted-foreground mb-4">PDF or DOCX, up to 10MB. Your CV stays private until you're shortlisted.</p>
          <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-border bg-sand p-5 hover:border-primary transition-colors group">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15">
              <Upload className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              {cvFile ? (
                <div>
                  <div className="font-semibold text-sm text-ink truncate">{cvFile.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{(cvFile.size / 1024 / 1024).toFixed(1)} MB · Click to change</div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-sm text-primary">Choose file or drag &amp; drop</div>
                  <div className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX — max 10MB</div>
                </div>
              )}
            </div>
            {cvFile && <CheckCircle2 className="size-5 text-success shrink-0" />}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </section>

        {/* Voice Notes */}
        {voiceReqs.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-xl">Voice notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Record live or upload an existing audio file. This is what HR will hear — speak clearly and naturally.
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

        {/* Submit */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-lift hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Submitting your application…" : "Submit application"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            By submitting you agree to your data being processed for recruitment purposes only.
            Your information stays private until you're shortlisted.
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder, className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
      />
    </label>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
      >
        {options.map((o) => <option key={o} value={o}>{o || "— Select —"}</option>)}
      </select>
    </label>
  );
}
