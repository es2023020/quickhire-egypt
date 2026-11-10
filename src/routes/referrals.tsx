import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Gift, Sparkles, Share2, Copy, Check, ArrowRight, DollarSign,
  Wallet, Users, CheckCircle2, Clock, ShieldCheck, ChevronRight,
  TrendingUp, Award, Send, MessageCircle, RefreshCw, AlertCircle,
  HelpCircle, ExternalLink, Zap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LANGUAGE_BOUNTIES,
  buildCandidateShareUrl,
  buildCandidateReferralShareMessage,
} from "@/lib/referral-engine";
import {
  registerOrGetAmbassador,
  getAmbassadorDashboard,
  submitPayoutRequest,
  type AmbassadorAccount,
  type AmbassadorDashboardData,
} from "@/lib/referral.functions";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referral & Ambassador Program — QuickHire Egypt" },
      {
        name: "description",
        content:
          "Earn from 1,000 to 3,500 EGP for every friend you refer who gets hired. Direct payouts via Vodafone Cash or InstaPay.",
      },
      { property: "og:title", content: "QuickHire Referral Program — Earn Cash Bounties" },
      { property: "og:description", content: "Turn your network into cash. 100% free for candidates and ambassadors." },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  // Calculator state
  const [calcCounts, setCalcCounts] = useState<Record<string, number>>({
    German: 1,
    Dutch: 0,
    French: 1,
    Italian: 0,
    English: 2,
  });

  // Generator form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"instapay" | "vodafone_cash" | "orange_money" | "bank_transfer">("instapay");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [activeAmbassador, setActiveAmbassador] = useState<AmbassadorAccount | null>(null);

  // Tracker query state
  const [trackingQuery, setTrackingQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payout request modal
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const [requestMethod, setRequestMethod] = useState("instapay");
  const [requestWallet, setRequestWallet] = useState("");

  // Total calculated earnings
  const calculatedTotal = useMemo(() => {
    return (
      (calcCounts["German"] || 0) * 3000 +
      (calcCounts["Dutch"] || 0) * 3500 +
      (calcCounts["French"] || 0) * 2500 +
      (calcCounts["Italian"] || 0) * 2000 +
      (calcCounts["English"] || 0) * 1000
    );
  }, [calcCounts]);

  // Dashboard query
  const dashboardQuery = useQuery({
    queryKey: ["ambassador-dashboard", activeSearchQuery],
    queryFn: () => getAmbassadorDashboard(activeSearchQuery),
    enabled: activeSearchQuery.trim().length >= 3,
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: registerOrGetAmbassador,
    onSuccess: (data) => {
      setActiveAmbassador(data);
      setActiveSearchQuery(data.referral_code);
      toast.success("Referral Link & Code Activated!", {
        description: `Your custom referral code is ${data.referral_code}`,
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to activate ambassador code");
    },
  });

  // Payout mutation
  const payoutMutation = useMutation({
    mutationFn: submitPayoutRequest,
    onSuccess: (payout) => {
      toast.success("Payout Request Submitted!", {
        description: `Request for ${payout.amount.toLocaleString()} EGP sent to finance for approval.`,
      });
      setPayoutModalOpen(false);
      dashboardQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to submit payout request");
    },
  });

  function handleCreateAmbassador(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    registerMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      payout_method: payoutMethod,
      payout_account: payoutAccount.trim() || phone.trim(),
    });
  }

  function handleSearchTracker(e: React.FormEvent) {
    e.preventDefault();
    if (trackingQuery.trim().length < 3) {
      toast.error("Please enter your referral code or phone number");
      return;
    }
    setActiveSearchQuery(trackingQuery.trim());
  }

  function handleCopy(text: string, isCode = false) {
    navigator.clipboard.writeText(text).then(() => {
      if (isCode) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast.success("Copied to clipboard!");
    });
  }

  const currentAmbassador = activeAmbassador || dashboardQuery.data?.ambassador;
  const currentShareUrl = currentAmbassador
    ? buildCandidateShareUrl(currentAmbassador.referral_code)
    : "https://quickhire.eg/offers";
  const currentShareMsg = currentAmbassador
    ? buildCandidateReferralShareMessage({
        referrerName: currentAmbassador.name,
        code: currentAmbassador.referral_code,
        shareUrl: currentShareUrl,
      })
    : "";

  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden bg-hero py-24 md:py-36 border-b border-white/[0.06]">
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:4rem_4rem] pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/[0.08] blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-6 md:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary shadow-[0_0_12px_rgba(182,255,46,0.25)]">
            <Gift className="size-3.5" />
            <span>QuickHire Ambassador &amp; Bounty Network</span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Turn Your Network Into Cash.<br />
            <span className="text-white">Earn up to 3,500 EGP per Hire.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base md:text-lg text-[#E4E4E7]/90 leading-relaxed font-normal">
            Whether you are a candidate, a college student, or an HR professional: recommend friends for open sales &amp; multilingual roles across Egypt. When they get placed, cash is paid directly to your wallet within 24 hours.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="#generate"
              className="group inline-flex items-center gap-3 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_25px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all duration-200"
            >
              <span>Get My Referral Link</span>
              <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a
              href="#track"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-1 px-7 py-4 text-base font-semibold text-white shadow-sm hover:border-white/30 hover:bg-surface-2 transition-all"
            >
              <Wallet className="size-4 text-primary" />
              <span>Check My Earnings</span>
            </a>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="size-4 text-primary" /> Vodafone Cash &amp; InstaPay Supported
            </span>
            <span className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="size-4 text-primary" /> Paid Within 24h of Offer Acceptance
            </span>
            <span className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="size-4 text-primary" /> Zero Cost / 100% Free Always
            </span>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE BOUNTY CALCULATOR ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28 md:px-8">
        <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-8 md:p-12 shadow-2xl shadow-black/60 relative overflow-hidden">
          <div className="absolute right-0 top-0 size-96 rounded-full bg-primary/[0.05] blur-[100px] pointer-events-none" />

          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Earnings Simulator</span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white mt-1">
                  How much can you earn this month?
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Adjust the counters based on friends or university peers you can refer:
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "German", label: "🇩🇪 German Speakers (C1/B2)", bounty: 3000 },
                  { key: "Dutch", label: "🇳🇱 Dutch Speakers (B2/C1)", bounty: 3500 },
                  { key: "French", label: "🇫🇷 French Speakers (B2/C1)", bounty: 2500 },
                  { key: "Italian", label: "🇮🇹 Italian Speakers (B2/C1)", bounty: 2000 },
                  { key: "English", label: "🇬🇧 English Sales & SDRs", bounty: 1000 },
                ].map(({ key, label, bounty }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface-2 p-3.5 px-4"
                  >
                    <div>
                      <div className="text-xs md:text-sm font-bold text-white">{label}</div>
                      <div className="text-[11px] text-primary font-mono font-semibold">
                        +{bounty.toLocaleString()} EGP / hire
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setCalcCounts((prev) => ({
                            ...prev,
                            [key]: Math.max(0, (prev[key] || 0) - 1),
                          }))
                        }
                        className="size-8 rounded-lg border border-white/15 bg-surface-3 text-white flex items-center justify-center font-bold hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-sm text-white">
                        {calcCounts[key] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCalcCounts((prev) => ({
                            ...prev,
                            [key]: (prev[key] || 0) + 1,
                          }))
                        }
                        className="size-8 rounded-lg border border-white/15 bg-surface-3 text-white flex items-center justify-center font-bold hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Display */}
            <div className="md:col-span-5 flex flex-col justify-center items-center text-center rounded-3xl border border-primary/30 bg-surface-2 p-8 md:p-10 shadow-xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estimated Cash Bounty
              </span>
              <div className="font-display text-5xl md:text-6xl font-extrabold text-white tracking-tight">
                {calculatedTotal.toLocaleString()}
                <span className="text-xl md:text-2xl font-bold text-primary ml-2">EGP</span>
              </div>
              <p className="text-xs text-[#E4E4E7]/80 leading-relaxed max-w-xs font-normal">
                Transferred straight to your mobile wallet once candidate attends and accepts the job offer.
              </p>
              <a
                href="#generate"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all cursor-pointer"
              >
                <span>Start Referring Now</span>
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── GENERATE LINK / CODE SECTION ── */}
      <section id="generate" className="border-t border-white/[0.06] bg-surface-1/30 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 md:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Instant Setup</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
              Get Your Unique Ambassador Link &amp; Code
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
              Fill in your contact details so we know where to send your bounty payments. Takes 30 seconds.
            </p>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-8 md:p-10 shadow-2xl space-y-8">
            <form onSubmit={handleCreateAmbassador} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Your Full Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Karim El-Sayed"
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    WhatsApp Number <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Preferred Payout Channel
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
                  >
                    <option value="instapay" className="bg-surface-1">InstaPay (Instant)</option>
                    <option value="vodafone_cash" className="bg-surface-1">Vodafone Cash</option>
                    <option value="orange_money" className="bg-surface-1">Orange Money</option>
                    <option value="bank_transfer" className="bg-surface-1">Bank Transfer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Wallet Number or InstaPay Handle
                  </label>
                  <input
                    type="text"
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    placeholder="e.g. name@instapay or 010xxxxxxxx"
                    className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_25px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
              >
                {registerMutation.isPending ? <RefreshCw className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                <span>Activate My Ambassador Link &amp; Code</span>
              </button>
            </form>

            {/* Generated Share Box (Displayed when activated) */}
            {currentAmbassador && (
              <div className="rounded-2xl border border-primary/30 bg-surface-2 p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Your Code is Active</span>
                    <h3 className="font-display text-2xl font-bold text-white mt-0.5">
                      {currentAmbassador.name}'s Ambassador Pass
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Code:</span>
                    <span className="font-mono text-base font-bold text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-lg">
                      {currentAmbassador.referral_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentAmbassador.referral_code, true)}
                      className="p-2 rounded-lg border border-white/10 bg-surface-3 text-white hover:bg-white/10 transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Your Shareable Job Portal Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentShareUrl}
                      className="w-full rounded-xl border border-white/10 bg-surface-1 px-4 py-3 text-xs md:text-sm text-zinc-200 font-mono select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(currentShareUrl, false)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-3 px-5 py-3 text-xs font-bold text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                      <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                {/* Viral WhatsApp Share Action */}
                <div className="pt-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(currentShareMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-6 py-4 text-sm font-bold text-white shadow-lg hover:bg-[#20ba59] transition-all cursor-pointer"
                  >
                    <Share2 className="size-4.5" />
                    <span>Share Directly to WhatsApp Groups &amp; Chats</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TRACK AMBASSADOR EARNINGS SECTION ── */}
      <section id="track" className="mx-auto max-w-5xl px-6 py-20 md:py-28 md:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Live Wallet</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
            Track Your Referrals &amp; Payouts
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            Check live candidate screening statuses, pending bounties, and withdraw your funds.
          </p>
        </div>

        {/* Tracker Search Bar */}
        <div className="max-w-md mx-auto space-y-3">
          <form onSubmit={handleSearchTracker} className="flex items-center gap-3">
            <input
              type="text"
              value={trackingQuery}
              onChange={(e) => setTrackingQuery(e.target.value)}
              placeholder="Enter referral code or phone number…"
              className="flex-1 rounded-xl border border-white/10 bg-surface-1 px-4 py-3.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all shadow-xl"
            />
            <button
              type="submit"
              disabled={dashboardQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_18px_rgba(182,255,46,0.55)] hover:bg-[#c2ff47] transition-all cursor-pointer disabled:opacity-60"
            >
              {dashboardQuery.isFetching ? <RefreshCw className="size-4 animate-spin" /> : <Wallet className="size-4" />}
              <span>Lookup</span>
            </button>
          </form>

          {/* Quick Demo Preview Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Quick test profiles:</span>
            <button
              type="button"
              onClick={() => {
                setTrackingQuery("REF-OMAR-4783");
                setActiveSearchQuery("REF-OMAR-4783");
              }}
              className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-mono font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            >
              REF-OMAR-4783
            </button>
            <button
              type="button"
              onClick={() => {
                setTrackingQuery("REF-SARAH-3322");
                setActiveSearchQuery("REF-SARAH-3322");
              }}
              className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-1 text-[11px] font-mono font-medium text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              REF-SARAH-3322
            </button>
          </div>
        </div>

        {/* Dashboard Results Display */}
        {activeSearchQuery && (
          <div className="space-y-8">
            {dashboardQuery.isLoading ? (
              <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-16 text-center shadow-xl">
                <RefreshCw className="size-8 mx-auto animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Retrieving ambassador stats…</p>
              </div>
            ) : !dashboardQuery.data ? (
              <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-12 text-center shadow-xl space-y-3">
                <AlertCircle className="size-10 mx-auto text-amber-400" />
                <h3 className="font-display text-xl font-bold text-white">No Ambassador Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No ambassador code or applicants registered under <b>{activeSearchQuery}</b>. Use the generator above to create your code!
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* 4 Metric Cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Referred Total</span>
                      <Users className="size-4 text-zinc-400" />
                    </div>
                    <div className="font-display text-3xl font-extrabold text-white">
                      {dashboardQuery.data.metrics.totalReferred}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">Candidates applied</div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">In Screening</span>
                      <Clock className="size-4 text-amber-400" />
                    </div>
                    <div className="font-display text-3xl font-extrabold text-white">
                      {dashboardQuery.data.metrics.inPipeline}
                    </div>
                    <div className="text-[11px] text-amber-400/90 mt-1">Interviews &amp; Tests</div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Placed &amp; Hired</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </div>
                    <div className="font-display text-3xl font-extrabold text-primary">
                      {dashboardQuery.data.metrics.placedCount}
                    </div>
                    <div className="text-[11px] text-primary/80 mt-1">Earned bounties</div>
                  </div>

                  <div className="rounded-2xl border border-primary/30 bg-surface-2 p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-primary">Available Balance</span>
                      <Wallet className="size-4 text-primary" />
                    </div>
                    <div className="font-display text-3xl font-extrabold text-white">
                      {dashboardQuery.data.metrics.availableBalance.toLocaleString()}
                      <span className="text-xs font-bold text-primary ml-1">EGP</span>
                    </div>
                    <div className="mt-2 pt-1 border-t border-white/10 flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Paid: {dashboardQuery.data.metrics.paidOut.toLocaleString()} EGP</span>
                      {dashboardQuery.data.metrics.availableBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRequestAmount(dashboardQuery.data?.metrics.availableBalance || 0);
                            setPayoutModalOpen(true);
                          }}
                          className="font-bold text-primary hover:underline cursor-pointer"
                        >
                          Withdraw →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Referred Candidates Table */}
                <div className="rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
                    <h3 className="font-display text-lg font-bold text-white">
                      Referred Candidates Pipeline ({dashboardQuery.data.referrals.length})
                    </h3>
                    <span className="text-xs text-muted-foreground">Live Candidate Attribution</span>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {dashboardQuery.data.referrals.length === 0 ? (
                      <div className="p-10 text-center text-sm text-muted-foreground space-y-2">
                        <Users className="size-8 mx-auto text-muted-foreground/30" />
                        <p>No candidates have applied with your code yet.</p>
                        <p className="text-xs">Share your custom link on WhatsApp to start earning!</p>
                      </div>
                    ) : (
                      dashboardQuery.data.referrals.map((c) => (
                        <div key={c.id} className="p-5 px-6 flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{c.nameMasked}</span>
                              <span className="text-xs rounded-full border border-white/10 bg-surface-2 px-2.5 py-0.5 text-zinc-300">
                                {c.language}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {c.offerTitle} · {c.company}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span
                              className={cn(
                                "text-xs font-semibold px-3 py-1 rounded-full border",
                                c.isEligible
                                  ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_8px_rgba(182,255,46,0.2)]"
                                  : "border-white/10 bg-surface-2 text-zinc-300"
                              )}
                            >
                              {c.stageLabel}
                            </span>
                            <div className="text-right min-w-[90px]">
                              <div className="font-display text-sm font-bold text-white">
                                {c.bountyEgp.toLocaleString()} EGP
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {c.isEligible ? "Ready to Pay" : "In Review"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Withdrawal CTA if balance > 0 */}
                {dashboardQuery.data.metrics.availableBalance > 0 && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <span>You have {dashboardQuery.data.metrics.availableBalance.toLocaleString()} EGP ready for withdrawal!</span>
                      </div>
                      <p className="text-xs text-[#E4E4E7]/80">
                        Funds can be disbursed directly to your mobile wallet within 24 business hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestAmount(dashboardQuery.data?.metrics.availableBalance || 0);
                        setPayoutModalOpen(true);
                      }}
                      className="rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all cursor-pointer"
                    >
                      Request Cash Payout Now →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS TIMELINE ── */}
      <section className="border-t border-white/[0.06] bg-surface-1/40 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Simple Rules</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight">
              How the Bounty System Works
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Transparent, automated, and built for speed.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Share Your Link or Code",
                body: "Send your custom referral link to friends or post it on university/Facebook groups. When they open it, your code is automatically applied.",
              },
              {
                step: "02",
                title: "Friend Applies in 5 Min",
                body: "Your friend submits their CV and 60-second voice note. Our AI ranks their communication skills and schedules their interview slot.",
              },
              {
                step: "03",
                title: "Cash Sent to Your Wallet",
                body: "Once your friend is selected and accepts their job offer, your cash bounty is released straight to your Vodafone Cash or InstaPay.",
              },
            ].map(({ step, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/[0.08] bg-surface-1 p-8 shadow-xl space-y-4"
              >
                <div className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/30 w-fit px-3 py-1 rounded-full">
                  STEP {step}
                </div>
                <h3 className="font-display text-xl font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-[#E4E4E7]/80 font-normal">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION SECTION ── */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28 md:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">Everything you need to know about payouts and tracking.</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Who can become a QuickHire Ambassador?",
              a: "Anyone! Current candidates, university graduates, influencers, or working professionals. You do not need to be currently employed by QuickHire to earn bounties.",
            },
            {
              q: "How exactly do I receive my bounty money?",
              a: "Bounties are paid directly via InstaPay, Vodafone Cash, Orange Money, or local Egyptian bank transfer. You can enter your wallet details right when generating your code.",
            },
            {
              q: "When is the bounty paid out?",
              a: "Bounties are credited as soon as your candidate is shortlisted, attends their interview wave, and confirms their job offer with the hiring company (typically within 48 to 72 hours of interview).",
            },
            {
              q: "Is there a limit to how many people I can refer?",
              a: "No limit! You can refer 1 person or 50 people. The more qualified candidates you refer (especially in high-demand languages like German, French, and Dutch), the higher your monthly earnings.",
            },
            {
              q: "What if my friend forgets to use my link?",
              a: "They can simply type your referral code (e.g. REF-YOURNAME-XXXX) into the 'Referral Code' box at the bottom of the 5-minute application form.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-2xl border border-white/[0.08] bg-surface-1 p-6 space-y-2">
              <h4 className="font-display text-lg font-bold text-white">{q}</h4>
              <p className="text-sm leading-relaxed text-[#E4E4E7]/80 font-normal">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAYOUT REQUEST MODAL ── */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-surface-1 p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">Request Cash Payout</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Withdraw your earned referral balance directly to your Egyptian mobile wallet.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Withdrawal Amount (EGP)
                </label>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white font-mono font-bold outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Payout Channel
                </label>
                <select
                  value={requestMethod}
                  onChange={(e) => setRequestMethod(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                >
                  <option value="instapay">InstaPay (Instant)</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Wallet Number or InstaPay Address
                </label>
                <input
                  type="text"
                  required
                  value={requestWallet}
                  onChange={(e) => setRequestWallet(e.target.value)}
                  placeholder="e.g. 010xxxxxxxx or handle@instapay"
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="flex-1 rounded-xl border border-white/15 bg-surface-2 py-3 text-xs font-bold text-white hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payoutMutation.isPending || !requestWallet.trim() || requestAmount <= 0}
                onClick={() => {
                  if (dashboardQuery.data?.ambassador) {
                    payoutMutation.mutate({
                      refCode: dashboardQuery.data.ambassador.referral_code,
                      amount: requestAmount,
                      paymentMethod: requestMethod,
                      walletNumber: requestWallet.trim(),
                    });
                  }
                }}
                className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all cursor-pointer disabled:opacity-60"
              >
                {payoutMutation.isPending ? "Submitting…" : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
