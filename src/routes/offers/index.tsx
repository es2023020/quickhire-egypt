import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { 
  Search, Sparkles, HelpCircle, Compass, RefreshCw, 
  Check, ArrowRight, X, Star, MapPin, Briefcase, Languages
} from "lucide-react";
import { listOffers } from "@/lib/offers.functions";
import { OfferCard } from "@/components/offer-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const offersQO = queryOptions({
  queryKey: ["offers", "public"],
  queryFn: () => listOffers(),
  staleTime: 0,
});

export const Route = createFileRoute("/offers/")({
  head: () => ({
    meta: [
      { title: "Sales & Call Center Jobs in Egypt — QuickHire" },
      { name: "description", content: "Browse sales, call center and business development openings across Egypt. Apply in minutes." },
      { property: "og:title", content: "Sales & Call Center Jobs in Egypt — QuickHire" },
      { property: "og:description", content: "Curated live openings updated weekly." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(offersQO),
  component: OffersPage,
});

type QuizAnswers = {
  language: string;
  category: string;
  location: string;
  experience: string;
};

const INITIAL_ANSWERS: QuizAnswers = {
  language: "",
  category: "",
  location: "",
  experience: "",
};

function OffersPage() {
  const { data: offers } = useSuspenseQuery(offersQO);

  // Capture and persist referral code from URL if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("referred_by");
      if (ref) {
        localStorage.setItem("qh_pending_ref", ref.trim().toUpperCase());
      }
    }
  }, []);
  
  // Search and normal filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [lang, setLang] = useState("all");

  // Matcher Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [matchScores, setMatchScores] = useState<Record<string, number> | null>(null);

  // Extract unique categories & languages for filters
  const cats = useMemo(() => ["all", ...Array.from(new Set(offers.map((o) => o.category)))], [offers]);
  const langs = useMemo(
    () => ["all", ...Array.from(new Set(offers.map((o) => o.language).filter(Boolean) as string[]))],
    [offers],
  );

  // Compute match score for each offer
  function runMatcher(answers: QuizAnswers) {
    const scores: Record<string, number> = {};
    
    offers.forEach(o => {
      let score = 50; // base score

      // 1. Language Match (Weight: 35 points)
      if (o.language && o.language.toLowerCase() === answers.language.toLowerCase()) {
        score += 35;
      } else if (answers.language === "Arabic" && !o.language) {
        score += 20;
      } else if (o.language === "English") {
        score += 15;
      }

      // 2. Field Match (Weight: 30 points)
      if (o.category.toLowerCase().includes(answers.category.toLowerCase()) || 
          answers.category.toLowerCase().includes(o.category.toLowerCase())) {
        score += 30;
      } else if (o.category === "Customer Service") {
        score += 15;
      }

      // 3. Location Match (Weight: 20 points)
      if (answers.location === "no_pref") {
        score += 20;
      } else {
        const jobLoc = o.location.toLowerCase();
        const userLoc = answers.location.toLowerCase();
        if (jobLoc.includes(userLoc) || userLoc.includes(jobLoc)) {
          score += 20;
        } else if (jobLoc.includes("remote") || jobLoc.includes("work from home")) {
          score += 15;
        }
      }

      // 4. Experience Match (Weight: 15 points)
      if (answers.experience === "freshman") {
        if (o.salary_text.toLowerCase().includes("fresh") || o.summary.toLowerCase().includes("entry")) {
          score += 15;
        } else {
          score += 10;
        }
      } else if (answers.experience === "mid") {
        score += 15;
      } else if (answers.experience === "senior") {
        if (o.title.toLowerCase().includes("senior") || o.title.toLowerCase().includes("lead")) {
          score += 15;
        } else {
          score += 10;
        }
      }

      scores[o.id] = Math.min(score, 98);
    });

    setMatchScores(scores);
    setQuizOpen(false);
    toast.success("Job Matcher Complete!", {
      description: `Ranked ${offers.length} openings according to your profile.`
    });
  }

  function clearMatches() {
    setMatchScores(null);
    setQuizAnswers(INITIAL_ANSWERS);
    setQuizStep(1);
    toast.info("Matcher cleared", { description: "Viewing all standard job openings." });
  }

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...offers];

    // Filter by cat & lang only if Matcher isn't active
    if (cat !== "all" && !matchScores) {
      list = list.filter(o => o.category === cat);
    }
    if (lang !== "all" && !matchScores) {
      list = list.filter(o => o.language === lang);
    }

    // Search query filter
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(o => `${o.title} ${o.company} ${o.summary}`.toLowerCase().includes(s));
    }

    // Sort: if match matcher scores is active, sort by percentage match desc. Otherwise by featured first
    if (matchScores) {
      list.sort((a, b) => (matchScores[b.id] ?? 0) - (matchScores[a.id] ?? 0));
    } else {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return list;
  }, [offers, cat, lang, q, matchScores]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 space-y-12 bg-background text-foreground">
      
      {/* ── STUNNING HERO SECTION (Midnight Depth + Ambient Glow) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-1 p-8 md:p-12 shadow-2xl shadow-black/80">
        <div className="absolute right-0 top-0 size-96 rounded-full bg-primary/[0.06] blur-[100px] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold tracking-wide uppercase text-primary">
              <Sparkles className="size-3.5" /> Direct Egyptian Hiring Pool
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Explore Live Roles &amp; Opportunities
            </h1>
            <p className="text-base text-[#E4E4E7]/90 leading-relaxed font-normal">
              Browse {offers.length} verified listings with transparent compensation. Apply in 5 minutes with your CV and a 60-second voice note.
            </p>
          </div>

          {/* AI Matcher Banner Card */}
          <div className="w-full md:max-w-xs shrink-0 rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-xl shadow-black/40">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-surface-3 text-primary">
                <Compass className="size-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-base">Unsure where to start?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">30-second skill match quiz</p>
              </div>
            </div>
            
            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => setQuizOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <span>Take Matcher Quiz</span>
                <ArrowRight className="size-3.5" />
              </button>
              {matchScores && (
                <button
                  onClick={clearMatches}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface-1 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3" /> Clear Matches ({Object.keys(matchScores).length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MATCH FINDER STEPS DIALOG MODAL ── */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-surface-1 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setQuizOpen(false); setQuizStep(1); }}
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-white/10 bg-surface-2 text-muted-foreground hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Stepper Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Compass className="size-4 animate-spin-slow" /> Matcher Step {quizStep} of 4
              </div>
              <div className="mt-3 flex gap-1.5 h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={cn("flex-1 h-full rounded-full transition-all duration-300", s <= quizStep ? "bg-primary shadow-[0_0_8px_rgba(182,255,46,0.5)]" : "bg-white/10")} />
                ))}
              </div>
            </div>

            {/* Step 1: Language */}
            {quizStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">What is your primary work language?</h3>
                  <p className="text-xs text-muted-foreground mt-1">We match roles according to language proficiency.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {["English", "German", "French", "Italian", "Spanish", "Dutch", "Portuguese", "Russian", "Arabic"].map(l => (
                    <button
                      key={l}
                      onClick={() => { setQuizAnswers(p => ({ ...p, language: l })); setQuizStep(2); }}
                      className={cn(
                        "rounded-xl border p-3.5 text-left text-sm font-semibold transition-all cursor-pointer",
                        quizAnswers.language === l
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(182,255,46,0.2)]"
                          : "border-white/10 bg-surface-2 text-zinc-200 hover:border-white/25 hover:bg-surface-3 hover:text-white"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Field */}
            {quizStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Which career track interests you most?</h3>
                  <p className="text-xs text-muted-foreground mt-1">Select the operational role you thrive in.</p>
                </div>
                <div className="space-y-2.5">
                  {[
                    { val: "Customer Service", title: "Customer Support & Accounts", desc: "Omnichannel customer resolution, retention and chat." },
                    { val: "Sales", title: "Direct Sales & Telesales", desc: "Pipeline generation, closing quotas and commissions." },
                    { val: "Technical Support", title: "Technical Support & Troubleshooting", desc: "Product diagnostics, tier-1 IT support, SaaS setup." }
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => { setQuizAnswers(p => ({ ...p, category: f.val })); setQuizStep(3); }}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-all cursor-pointer block",
                        quizAnswers.category === f.val
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(182,255,46,0.2)]"
                          : "border-white/10 bg-surface-2 hover:border-white/25 hover:bg-surface-3"
                      )}
                    >
                      <div className="font-semibold text-sm text-white">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizStep(1)} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer">← Back</button>
              </div>
            )}

            {/* Step 3: Location */}
            {quizStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">What is your location preference?</h3>
                  <p className="text-xs text-muted-foreground mt-1">We filter jobs with nearby shuttle hubs or remote work.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { val: "Maadi", label: "Maadi / Degla" },
                    { val: "New Cairo", label: "New Cairo / 5th Settl." },
                    { val: "Smart Village", label: "Smart Village" },
                    { val: "6th of October", label: "6th of October" },
                    { val: "remote", label: "Work From Home" },
                    { val: "no_pref", label: "No Preference / All" },
                  ].map(locOpt => (
                    <button
                      key={locOpt.val}
                      onClick={() => { setQuizAnswers(p => ({ ...p, location: locOpt.val })); setQuizStep(4); }}
                      className={cn(
                        "rounded-xl border p-3.5 text-left text-sm font-semibold transition-all cursor-pointer",
                        quizAnswers.location === locOpt.val
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(182,255,46,0.2)]"
                          : "border-white/10 bg-surface-2 text-zinc-200 hover:border-white/25 hover:bg-surface-3 hover:text-white"
                      )}
                    >
                      {locOpt.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizStep(2)} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer">← Back</button>
              </div>
            )}

            {/* Step 4: Experience */}
            {quizStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">What is your experience level?</h3>
                  <p className="text-xs text-muted-foreground mt-1">Helps align salary tier and seniority expectations.</p>
                </div>
                <div className="space-y-2.5">
                  {[
                    { val: "freshman", title: "Fresh Graduate / Under 1 Year", desc: "Ready for intensive training and entry placement." },
                    { val: "mid", title: "1–3 Years Commercial Experience", desc: "Experienced handling calls, quota, and CRM workflows." },
                    { val: "senior", title: "3+ Years / Senior Specialist", desc: "Seeking team leadership or enterprise tier accounts." }
                  ].map(eOpt => (
                    <button
                      key={eOpt.val}
                      onClick={() => {
                        const finalAnswers = { ...quizAnswers, experience: eOpt.val };
                        setQuizAnswers(finalAnswers);
                        runMatcher(finalAnswers);
                      }}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-all cursor-pointer block",
                        quizAnswers.experience === eOpt.val
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(182,255,46,0.2)]"
                          : "border-white/10 bg-surface-2 hover:border-white/25 hover:bg-surface-3"
                      )}
                    >
                      <div className="font-semibold text-sm text-white">{eOpt.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{eOpt.desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizStep(3)} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer">← Back</button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH SECTION (Generous Padding) ── */}
      {!matchScores && (
        <div className="space-y-6 rounded-2xl border border-white/[0.08] bg-surface-1 p-6 md:p-8 shadow-xl">
          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by role title, company, or keywords…"
              className="w-full rounded-xl border border-white/10 bg-surface-2 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_15px_rgba(182,255,46,0.2)] transition-all"
            />
          </div>

          <div className="space-y-4 pt-2">
            {/* Category Pills */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Category</span>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer border",
                      cat === c
                        ? "bg-white border-white text-black font-bold shadow-md"
                        : "bg-surface-2 border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                    )}
                  >
                    {c === "all" ? "All Categories" : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Pills */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Language</span>
              <div className="flex flex-wrap gap-2">
                {langs.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer border",
                      lang === l
                        ? "bg-primary border-primary text-primary-foreground font-bold shadow-[0_0_12px_rgba(182,255,46,0.3)]"
                        : "bg-surface-2 border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                    )}
                  >
                    {l === "all" ? "All Languages" : l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MATCHED SUMMARY BANNER */}
      {matchScores && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-6 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="size-4 text-primary" />
              <span>Personalized AI Matches Active</span>
            </div>
            <p className="text-xs text-[#E4E4E7]/90">
              Ranked according to: {quizAnswers.language} • {quizAnswers.category} • {quizAnswers.location} • {quizAnswers.experience}.
            </p>
          </div>
          <button
            onClick={clearMatches}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-2 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-surface-3 transition-colors cursor-pointer"
          >
            Clear matches &amp; reset
          </button>
        </div>
      )}

      {/* ── JOB GRID VIEW ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            {matchScores ? "Top Recommendations" : "Available Openings"} ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-surface-1 p-16 text-center text-muted-foreground shadow-xl">
            <Compass className="size-10 mx-auto text-muted-foreground/30 animate-pulse" />
            <p className="mt-4 text-base font-semibold text-white">No positions match your selected criteria.</p>
            <p className="text-xs text-muted-foreground mt-1">Try resetting the language or category filters to view more.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((o) => (
              <OfferCard 
                key={o.id} 
                offer={o} 
                matchScore={matchScores ? matchScores[o.id] : undefined}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
