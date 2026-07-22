import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
        score += 20; // Arabic matches general Egyptian roles
      } else if (o.language === "English") {
        score += 15; // English is a secondary match for most
      }

      // 2. Field Match (Weight: 30 points)
      if (o.category.toLowerCase().includes(answers.category.toLowerCase()) || 
          answers.category.toLowerCase().includes(o.category.toLowerCase())) {
        score += 30;
      } else if (o.category === "Customer Service") {
        score += 15; // general customer service is a safe fallback
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
          score += 15; // remote is a good secondary match
        } else {
          score -= 10;
        }
      }

      // 4. Experience Match (Weight: 15 points)
      const reqText = (o.requirements ?? []).join(" ").toLowerCase();
      const descText = o.description.toLowerCase();
      const hasExperienceReq = reqText.includes("experience") || reqText.includes("exp") || descText.includes("experience");

      if (answers.experience === "freshman") {
        if (!hasExperienceReq) score += 15;
        else score -= 5;
      } else if (answers.experience === "mid") {
        score += 15; // fits most roles
      } else if (answers.experience === "senior") {
        if (hasExperienceReq || descText.includes("senior") || descText.includes("lead")) {
          score += 15;
        } else {
          score += 10;
        }
      }

      // Clamp score
      scores[o.id] = Math.min(100, Math.max(30, score));
    });

    setMatchScores(scores);
    setQuizOpen(false);
    setQuizStep(1);
    toast.success("Matching complete! Here are your personalized recommendations.");
  }

  function clearMatches() {
    setMatchScores(null);
    setQuizAnswers(INITIAL_ANSWERS);
  }

  // Filter & sort rows
  const filtered = useMemo(() => {
    let list = [...offers];

    // Filter by match matcher scores if active
    if (matchScores) {
      list = list.filter(o => (matchScores[o.id] ?? 0) >= 60); // only show >60% match
    }

    // Standard Category & Language filters
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
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 space-y-8">
      
      {/* ── STUNNING HERO SECTION ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-violet-50/20 to-card p-6 md:p-10 shadow-soft">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-20 -mb-20 size-80 rounded-full bg-violet-300/10 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
              <Sparkles className="size-3.5" /> Egypt's Smartest Job Board
            </span>
            <h1 className="font-display text-3xl md:text-5xl leading-tight text-ink">
              Find your next job in seconds
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Explore {offers.length} pre-qualified jobs with transparent salaries. Apply securely with one click using your CV and a voice note.
            </p>
          </div>

          {/* AI Matcher Banner Card */}
          <div className="w-full md:max-w-xs shrink-0 rounded-2xl border border-violet-100 bg-white p-5 shadow-soft hover:shadow-lift transition-all">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
                <Compass className="size-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-ink text-sm">Not sure what to apply in?</h3>
                <p className="text-[10px] text-muted-foreground">Find matching positions in 30 seconds</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setQuizOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:opacity-95 transition-opacity"
              >
                Start Matcher Quiz <ArrowRight className="size-3.5" />
              </button>
              {matchScores && (
                <button
                  onClick={clearMatches}
                  className="w-full inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-sand transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setQuizOpen(false); setQuizStep(1); }}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-sand hover:bg-sand-deep text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Stepper Header */}
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-600">
                <Compass className="size-4 animate-spin-slow" /> Job Matcher Quiz
              </div>
              <div className="mt-2 flex gap-1 h-1.5 w-full bg-sand rounded-full overflow-hidden">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={cn("flex-1 h-full rounded-full transition-all duration-300", s <= quizStep ? "bg-violet-600" : "bg-border")} />
                ))}
              </div>
            </div>

            {/* Step 1: Language */}
            {quizStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">What is your primary work language?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">We will show jobs requiring this language.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["English", "German", "French", "Italian", "Spanish", "Dutch", "Portuguese", "Russian", "Arabic"].map(l => (
                    <button
                      key={l}
                      onClick={() => { setQuizAnswers(p => ({ ...p, language: l })); setQuizStep(2); }}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm font-semibold transition-all hover:bg-violet-50 hover:border-violet-300",
                        quizAnswers.language === l ? "border-violet-600 bg-violet-50/50 text-violet-700" : "border-border"
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
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">Which field interests you most?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select a role type you enjoy.</p>
                </div>
                <div className="space-y-2">
                  {[
                    { val: "Customer Service", title: "📞 Customer Service", desc: "Resolving customer queries, handling accounts, chat & calls." },
                    { val: "Sales", title: "🎯 Sales & Telesales", desc: "Hitting targets, outperforming pipelines, uncapped commissions." },
                    { val: "Technical Support", title: "🛠 Technical Support", desc: "Troubleshooting product errors, software billing support." }
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => { setQuizAnswers(p => ({ ...p, category: f.val })); setQuizStep(3); }}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-all hover:bg-violet-50 hover:border-violet-300 block",
                        quizAnswers.category === f.val ? "border-violet-600 bg-violet-50/50" : "border-border"
                      )}
                    >
                      <div className="font-semibold text-sm text-ink">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizStep(1)} className="text-xs text-muted-foreground hover:underline">← Back</button>
              </div>
            )}

            {/* Step 3: Location */}
            {quizStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">What is your location preference?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">We will match jobs near you or remote.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "Maadi", label: "📍 Maadi" },
                    { val: "New Cairo", label: "📍 New Cairo" },
                    { val: "Smart Village", label: "📍 Smart Village" },
                    { val: "6th of October", label: "📍 6th of October" },
                    { val: "remote", label: "🏠 Work from Home" },
                    { val: "no_pref", label: "✨ No Preference" },
                  ].map(locOpt => (
                    <button
                      key={locOpt.val}
                      onClick={() => { setQuizAnswers(p => ({ ...p, location: locOpt.val })); setQuizStep(4); }}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm font-semibold transition-all hover:bg-violet-50 hover:border-violet-300",
                        quizAnswers.location === locOpt.val ? "border-violet-600 bg-violet-50/50 text-violet-700" : "border-border"
                      )}
                    >
                      {locOpt.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizStep(2)} className="text-xs text-muted-foreground hover:underline">← Back</button>
              </div>
            )}

            {/* Step 4: Experience */}
            {quizStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">What is your experience level?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Helps filter qualifications and seniority.</p>
                </div>
                <div className="space-y-2">
                  {[
                    { val: "freshman", title: "Fresh Graduate / No Experience", desc: "Looking for entry-level training and onboarding." },
                    { val: "mid", title: "1–3 Years Experience", desc: "Comfortable handling customer calls and CRM tools." },
                    { val: "senior", title: "3+ Years Experience", desc: "Seeking team lead track or premium accounts." }
                  ].map(eOpt => (
                    <button
                      key={eOpt.val}
                      onClick={() => {
                        const finalAnswers = { ...quizAnswers, experience: eOpt.val };
                        setQuizAnswers(finalAnswers);
                        runMatcher(finalAnswers);
                      }}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-all hover:bg-violet-50 hover:border-violet-300 block",
                        quizAnswers.experience === eOpt.val ? "border-violet-600 bg-violet-50/50" : "border-border"
                      )}
                    >
                      <div className="font-semibold text-sm text-ink">{eOpt.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{eOpt.desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizStep(3)} className="text-xs text-muted-foreground hover:underline">← Back</button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── PREMIUM PILL FILTER PANEL ── */}
      {!matchScores && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, role, company keywords…"
              className="w-full rounded-2xl border border-border bg-card pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring shadow-soft"
            />
          </div>

          <div className="space-y-3">
            {/* Category Pills */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Category</span>
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer border",
                      cat === c
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "bg-white border-border text-muted-foreground hover:text-foreground hover:bg-sand"
                    )}
                  >
                    {c === "all" ? "All categories" : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Pills */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Language</span>
              <div className="flex flex-wrap gap-1.5">
                {langs.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer border",
                      lang === l
                        ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                        : "bg-white border-border text-muted-foreground hover:text-foreground hover:bg-sand"
                    )}
                  >
                    {l === "all" ? "All languages" : l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MATCHED SUMMARY BAR */}
      {matchScores && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-violet-900">
              <Star className="size-4 text-violet-600 fill-violet-600" />
              Showing Matches For You
            </div>
            <p className="text-xs text-violet-700 mt-0.5">
              Filtered to display positions matching your language ({quizAnswers.language}), field ({quizAnswers.category}), location, and experience.
            </p>
          </div>
          <button
            onClick={clearMatches}
            className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-soft hover:bg-violet-700 transition-colors"
          >
            Clear matches & reset view
          </button>
        </div>
      )}

      {/* ── JOB GRID VIEW ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">
            {matchScores ? "Top Recommendations" : "Browse Positions"} ({filtered.length} found)
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground shadow-soft">
            <Compass className="size-10 mx-auto text-muted-foreground/30 animate-pulse" />
            <p className="mt-4 text-sm font-medium">No offers match your search filters.</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Try resetting filters or expanding your keywords.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
