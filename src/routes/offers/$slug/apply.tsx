import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Upload, Info, MessageCircle, Mail, Sparkles, ArrowRight, Gift, Copy, Check, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getOfferBySlug, listOffers } from "@/lib/offers.functions";
import { submitApplication } from "@/lib/applications.functions";
import { VoiceRecorder } from "@/components/voice-recorder";
import { saveFile } from "@/lib/db";
import { LANGUAGE_BOUNTIES, buildCandidateReferralShareMessage, buildCandidateShareUrl } from "@/lib/referral-engine";

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

function fakePath(prefix: string, filename: string) {
  return `${prefix}/${Date.now()}-${filename}`;
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

  const allOffersQuery = useQuery({
    queryKey: ["offers", "all-active"],
    queryFn: () => listOffers(),
  });

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

  // Questions
  const [workedBefore, setWorkedBefore] = useState("");
  const [hasContract, setHasContract] = useState("");
  const [contactedHR, setContactedHR] = useState("");
  const [roleAnswers, setRoleAnswers] = useState<Record<string, string>>({});

  // Referral states
  const [referralInput, setReferralInput] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("ref") ||
        params.get("referred_by") ||
        localStorage.getItem("qh_pending_ref") ||
        ""
      );
    }
    return "";
  });
  const [generatedRefCode, setGeneratedRefCode] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get("ref") || params.get("referred_by");
      if (urlRef) {
        setReferralInput(urlRef.trim().toUpperCase());
        localStorage.setItem("qh_pending_ref", urlRef.trim().toUpperCase());
      }
    }
  }, []);

  useEffect(() => {
    if (referralInput && typeof window !== "undefined") {
      localStorage.setItem("qh_pending_ref", referralInput.trim().toUpperCase());
    }
  }, [referralInput]);

  if (!offer) return null;
  if (offer.status === "on_hold") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center bg-background text-foreground">
        <div className="rounded-3xl border border-amber-500/30 bg-surface-1 p-10 shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-amber-300">Applications Paused</h2>
          <p className="mt-4 text-sm text-[#E4E4E7]/90 leading-relaxed font-normal">
            Thank you for your interest! The position for <strong>{offer.title}</strong> at <strong>{offer.company}</strong> is currently on hold. We are not accepting applications at this time.
          </p>
          <div className="mt-6">
            <Link to="/offers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              ← Browse other opportunities
            </Link>
          </div>
        </div>
      </div>
    );
  }
  const voiceReqs = offer.form_schema?.voice_notes ?? [];
  const roleQuestions = getRoleQuestions(offer.category);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offer) return;
    if (!cvFile) return toast.error("Please upload your CV (PDF or DOCX)");
    if (cvFile.size > 5 * 1024 * 1024) {
      return toast.error("CV file is too large. Maximum size is 5MB.");
    }
    for (const v of voiceReqs) {
      if (!voiceBlobs[v.lang]) return toast.error(`Please provide your ${v.lang} voice note`);
    }
    setSubmitting(true);
    try {
      const cvPath = fakePath("cvs", cvFile.name);
      const voiceNotes: { lang: string; path: string }[] = [];
      for (const v of voiceReqs) {
        const blob = voiceBlobs[v.lang]!;
        const ext = blob.type.includes("mp4") || blob.type.includes("m4a") ? "m4a"
          : blob.type.includes("mp3") || blob.type.includes("mpeg") ? "mp3"
          : blob.type.includes("wav") ? "wav"
          : "webm";
        voiceNotes.push({ lang: v.lang, path: fakePath("voice-notes", `${v.lang.toLowerCase()}.${ext}`) });
      }

      const answers: Record<string, string> = {
        worked_before_at_company: workedBefore,
        has_contract_or_resigned: hasContract,
        contacted_hr_before: contactedHR,
        ...roleAnswers,
      };

      const { id: appId, referral_code } = await submitApplication({
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
          cv_data: null,
          voice_notes: voiceNotes,
          referred_by: referralInput.trim() || null,
        },
      });
      if (referral_code) setGeneratedRefCode(referral_code);

      await saveFile(`${appId}-cv`, cvFile);
      for (let i = 0; i < voiceReqs.length; i++) {
        const blob = voiceBlobs[voiceReqs[i].lang]!;
        await saveFile(`${appId}-voice-${voiceReqs[i].lang}`, blob);
      }

      setDone(true);
      toast.success("Application submitted successfully!");
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
      <div className="mx-auto flex min-h-[75vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center bg-background text-foreground">
        <div className="grid size-20 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary shadow-[0_0_20px_rgba(182,255,46,0.35)]">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-8 font-display text-4xl md:text-5xl font-bold text-white tracking-tight">Application Sent</h1>
        <p className="mt-4 text-base text-[#E4E4E7]/90 leading-relaxed max-w-md font-normal">
          Your profile for <b>{offer.title}</b> is currently being scored by our AI engine.
          Shortlisted candidates receive a direct call or WhatsApp from HR within <b>24–48 hours</b>.
        </p>

        <div className="mt-8 w-full rounded-2xl border border-white/10 bg-surface-1 p-6 text-left shadow-xl space-y-4">
          <div>
            <p className="text-sm font-bold text-white">Confirm Your Contact Number</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send a quick ping on WhatsApp to verify we have your correct contact:
            </p>
          </div>
          <a
            href={`https://wa.me/${QUICKHIRE_WA}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_22px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all"
          >
            <MessageCircle className="size-4" /> Confirm on WhatsApp
          </a>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/track"
            search={{ phone }}
            className="rounded-xl border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-bold text-primary hover:bg-primary/20 transition-all shadow-sm"
          >
            Track Status Live
          </Link>
          <Link
            to="/offers"
            className="rounded-xl border border-white/10 bg-surface-2 px-6 py-3 text-sm font-semibold text-white hover:bg-surface-3 transition-colors"
          >
            Browse More Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16 space-y-10 bg-background text-foreground">
      {/* Header */}
      <div className="space-y-4">
        <Link
          to="/offers/$slug"
          params={{ slug }}
          className="text-sm font-medium text-muted-foreground hover:text-white inline-flex items-center gap-1.5 transition-colors"
        >
          ← Back to job listing
        </Link>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white">
          Apply · {offer.title}
        </h1>
        <div className="text-base text-muted-foreground">
          {offer.company} · {offer.location}
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-1 px-4 py-2.5 text-xs text-zinc-300">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <span>Takes ~5 minutes. Your personal details stay strictly confidential until shortlisted.</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Personal Details */}
        <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-7 md:p-8 shadow-xl shadow-black/40 space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">Your Contact Profile</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" required value={fullName} onChange={setFullName} placeholder="Mohamed Ahmed" />
            <Field label="Email address" type="email" required value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="WhatsApp phone number" required value={phone} onChange={setPhone} placeholder="+20 10 0000 0000" />
            <Field label="Age" type="number" value={age} onChange={setAge} placeholder="e.g. 24" />
            <Field label="City / Area" value={location} onChange={setLocation} placeholder="Cairo, Maadi, Giza…" />
            <Select label="Graduation status" value={gradStatus} onChange={setGradStatus}
              options={["", "Graduate", "Undergraduate", "Dropout"]} />
            <Select label="English level" value={englishLevel} onChange={setEnglishLevel}
              options={["", "B1 – Intermediate", "B2 – Upper Intermediate", "C1 – Advanced", "C2 – Fluent / Native"]} />
            <Field label="Years of relevant experience" type="number" value={experience} onChange={setExperience} placeholder="0" />
            <Field label="Expected monthly salary (EGP)" value={salaryExp} onChange={setSalaryExp} placeholder="e.g. 15000" className="md:col-span-2" />
          </div>
        </section>

        {/* Company-specific questions */}
        <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-7 md:p-8 shadow-xl shadow-black/40 space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Pre-Screening Questions</h2>
            <p className="text-xs text-muted-foreground mt-1">Please answer accurately to fast-track hiring review.</p>
          </div>
          <div className="space-y-4">
            <Select
              label={`Have you worked at ${offer.company} previously?`}
              value={workedBefore}
              onChange={setWorkedBefore}
              options={["", "Yes – full time employee", "Yes – contractor / intern", "No"]}
            />
            <Select
              label="What is your current notice period / contract status?"
              value={hasContract}
              onChange={setHasContract}
              options={["", "Immediately available (0 notice)", "1-2 weeks notice period", "1 month notice period", "Active contract"]}
            />
            <Select
              label={`Have you been interviewed by ${offer.company} in the last 6 months?`}
              value={contactedHR}
              onChange={setContactedHR}
              options={["", "Yes – within last 3 months", "Yes – 3 to 6 months ago", "No"]}
            />
          </div>
        </section>

        {/* Role-specific questions */}
        {roleQuestions.length > 0 && (
          <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-7 md:p-8 shadow-xl shadow-black/40 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Role-Specific Benchmarks</h2>
              <p className="text-xs text-muted-foreground mt-1">Specific criteria for <b>{offer.category}</b> roles.</p>
            </div>
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
        <section className="rounded-2xl border border-white/[0.08] bg-surface-1 p-7 md:p-8 shadow-xl shadow-black/40 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Upload Your CV</h2>
            <p className="text-xs text-muted-foreground mt-1">PDF or DOCX format, up to 5MB.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-5 rounded-2xl border-2 border-dashed border-white/15 bg-surface-2 p-6 hover:border-primary/60 hover:bg-surface-3 transition-colors group">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Upload className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              {cvFile ? (
                <div>
                  <div className="font-bold text-sm text-white truncate">{cvFile.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{(cvFile.size / 1024 / 1024).toFixed(1)} MB · Tap to replace</div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-sm text-primary">Choose CV file or drag here</div>
                  <div className="text-xs text-muted-foreground mt-0.5">PDF or Word document (max 5MB)</div>
                </div>
              )}
            </div>
            {cvFile && <CheckCircle2 className="size-6 text-primary shrink-0" />}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  toast.error("CV file is too large. Maximum size allowed is 5MB.");
                  e.target.value = "";
                  setCvFile(null);
                  return;
                }
                setCvFile(file);
              }}
              className="hidden"
            />
          </label>
        </section>

        {/* Voice Notes */}
        {voiceReqs.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">AI Voice Assessment</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Record directly or upload audio. Our AI evaluates pronunciation, confidence and tone.
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

        {/* Optional Referral Code */}
        <section className="rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Gift className="size-4 text-primary" />
              <span>Referral Ambassador Code (Optional)</span>
            </div>
            {referralInput && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-primary">
                <Check className="size-3" /> Active: {referralInput}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If an existing employee, student, or ambassador referred you, enter their unique code so their bounty is credited upon your placement.
          </p>
          <input
            type="text"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
            placeholder="e.g. REF-OMAR-4783"
            className="w-full rounded-xl border border-white/10 bg-surface-1 px-4 py-3 text-sm text-white uppercase tracking-wider font-mono outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </section>

        {/* Submit (1 Primary Lime Action) */}
        <div className="space-y-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-8 py-4.5 text-base font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_25px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98] disabled:opacity-60 transition-all duration-200 cursor-pointer"
          >
            {submitting && <Loader2 className="size-5 animate-spin" />}
            <span>{submitting ? "Submitting Application & Uploading Audio…" : "Submit Application Now"}</span>
            {!submitting && <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            QuickHire is 100% free for candidates. Your information is processed under strict privacy guidelines.
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
    <label className={`block space-y-2 ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_12px_rgba(182,255,46,0.2)] transition-all"
      />
    </label>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface-1 text-white">
            {o || "— Please Select —"}
          </option>
        ))}
      </select>
    </label>
  );
}
