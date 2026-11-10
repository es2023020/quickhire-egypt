import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListApplications,
  adminUpdateBountyPayment,
  adminUpdateBillingStatus,
} from "@/lib/applications.functions";
import {
  buildBillingSummary,
  type PlacementBillingRow,
} from "@/lib/billing-engine";
import {
  Banknote, DollarSign, Wallet, ArrowUpRight, CheckCircle2,
  Clock, Download, Building2, Globe, MessageCircle, AlertCircle,
  Filter, ShieldCheck, ChevronRight, Send, Coins, Users, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  head: () => ({
    meta: [
      { title: "Revenue & Bounties Ledger — QuickHire Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBillingPage,
});

function AdminBillingPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"placements" | "bounties">("placements");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [bountyFilter, setBountyFilter] = useState<"all" | "pending_review" | "ready_to_pay" | "paid">("all");

  // Selected candidate for recording payout modal
  const [selectedBountyRow, setSelectedBountyRow] = useState<PlacementBillingRow | null>(null);
  const [payMethod, setPayMethod] = useState<"vodafone_cash" | "instapay" | "orange_money" | "bank_transfer">("instapay");
  const [payRef, setPayRef] = useState("");

  const appsQuery = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => adminListApplications({ data: {} }),
  });

  const updateBountyMutation = useMutation({
    mutationFn: ({
      id,
      bounty_status,
      payment_method,
      transaction_ref,
    }: {
      id: string;
      bounty_status: "pending_review" | "ready_to_pay" | "paid";
      payment_method?: "vodafone_cash" | "instapay" | "orange_money" | "bank_transfer" | null;
      transaction_ref?: string | null;
    }) =>
      adminUpdateBountyPayment({
        data: { id, bounty_status, payment_method, transaction_ref },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast.success("Ambassador bounty status updated!");
      setSelectedBountyRow(null);
      setPayRef("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update bounty");
    },
  });

  const updateBillingMutation = useMutation({
    mutationFn: ({
      id,
      billing_status,
    }: {
      id: string;
      billing_status: "pending_guarantee" | "invoiced" | "collected";
    }) =>
      adminUpdateBillingStatus({
        data: { id, billing_status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast.success("Client placement billing status updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update billing");
    },
  });

  const apps = appsQuery.data || [];
  const billingSummary = buildBillingSummary(apps);

  const filteredPlacements = billingSummary.placements.filter((p) => {
    if (companyFilter !== "all" && p.company !== companyFilter) return false;
    return true;
  });

  const referralPlacements = billingSummary.placements.filter((p) => Boolean(p.referredByCode));

  const filteredBounties = referralPlacements.filter((p) => {
    if (bountyFilter !== "all" && p.bountyStatus !== bountyFilter) return false;
    return true;
  });

  function handleExportCsv() {
    const headers = [
      "Candidate Name",
      "Candidate Phone",
      "Partner Company",
      "Role",
      "Language",
      "Placement Date",
      "Placement Fee (EGP)",
      "Billing Status",
      "Guarantee Days Remaining",
      "Ambassador Referral Code",
      "Ambassador Bounty (EGP)",
      "Bounty Status",
      "Bounty Payment Method",
      "Transaction Ref",
    ];

    const rows = billingSummary.placements.map((p) => [
      `"${p.candidateName}"`,
      `"${p.candidatePhone}"`,
      `"${p.company}"`,
      `"${p.offerTitle}"`,
      `"${p.language}"`,
      `"${p.hiredDate.slice(0, 10)}"`,
      p.placementFeeEgp,
      `"${p.billingStatus}"`,
      p.guaranteeDaysRemaining,
      `"${p.referredByCode || "Direct"}"`,
      p.ambassadorBountyEgp,
      `"${p.bountyStatus}"`,
      `"${p.bountyPaymentMethod || ""}"`,
      `"${p.bountyTransactionRef || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickHire_Agency_Billing_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Billing ledger CSV exported!");
  }

  function handleRecordPayoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBountyRow) return;

    updateBountyMutation.mutate({
      id: selectedBountyRow.candidateId,
      bounty_status: "paid",
      payment_method: payMethod,
      transaction_ref: payRef.trim() || `TX-${Date.now().toString().slice(-6)}`,
    });
  }

  function getWhatsAppNotifyUrl(p: PlacementBillingRow) {
    const candidateName = p.candidateName;
    const bountyEgp = p.ambassadorBountyEgp.toLocaleString();
    const method = p.bountyPaymentMethod === "vodafone_cash" ? "فودافون كاش" : "انستاباي";
    const ref = p.bountyTransactionRef || "معتمد";

    const msg =
      `🎉 *مبروك من كويك هاير — تحويل مكافأة الترشيح!*\n\n` +
      `يسرنا إبلاغك بأنه تم بنجاح تحويل مكافأة ترشيح المرشح *${candidateName}* ` +
      `بقيمة *${bountyEgp} جنيه مصري* عبر *${method}* (رقم المعاملة: ${ref}).\n\n` +
      `شكراً لكونك شريك نجاح ومساعدتنا في توظيف أفضل الكوادر.\n` +
      `كود السفير الخاص بك مفعّل دائماً لترشيح زملاء جدد!\n\n` +
      `*QuickHire Egypt Operations*`;

    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 bg-background text-foreground">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono mb-2">
            <Banknote className="size-3.5" /> REVENUE &amp; BOUNTY LEDGER
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
            Placement Billing &amp; Ambassador Ledger
          </h1>
          <p className="mt-1 text-sm text-[#E4E4E7]/80">
            BPO Client invoicing, 90-day retention guarantee tracking, and Vodafone Cash / InstaPay payouts.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="size-3.5" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Top 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Placement Billings</span>
            <div className="size-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-white">
            {billingSummary.totalGrossRevenueEgp.toLocaleString()} <span className="text-xs font-sans text-primary">EGP</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-emerald-400 font-semibold">{billingSummary.collectedRevenueEgp.toLocaleString()} EGP collected</span>
            <span>•</span>
            <span className="text-zinc-300">{billingSummary.totalHiresCount} total hires</span>
          </div>
        </div>

        {/* Ambassador Bounties Payable */}
        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ambassador Bounties</span>
            <div className="size-8 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
              <Coins className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-primary">
            {billingSummary.totalBountiesPayableEgp.toLocaleString()} <span className="text-xs font-sans text-zinc-400">EGP</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-emerald-400 font-semibold">{billingSummary.totalBountiesPaidEgp.toLocaleString()} EGP paid</span>
            <span>•</span>
            <span className="text-amber-400 font-medium">
              {(billingSummary.totalBountiesPayableEgp - billingSummary.totalBountiesPaidEgp).toLocaleString()} EGP pending
            </span>
          </div>
        </div>

        {/* Net Placement Agency Margin */}
        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Agency Margin</span>
            <div className="size-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-white">
            {billingSummary.netAgencyMarginEgp.toLocaleString()} <span className="text-xs font-sans text-primary">EGP</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            <span className="text-primary font-bold">{billingSummary.netMarginPercentage.toFixed(1)}%</span> net margin after bounties
          </div>
        </div>

        {/* Ambassador Sourcing Rate */}
        <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scout Sourcing Share</span>
            <div className="size-8 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-violet-300">
            {billingSummary.referralRatePercentage.toFixed(0)}%
          </div>
          <div className="text-[11px] text-muted-foreground">
            {billingSummary.referralHiresCount} of {billingSummary.totalHiresCount} hires sourced via ambassador network
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("placements")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "placements"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            BPO Client Placements &amp; Invoicing ({billingSummary.placements.length})
          </button>
          <button
            onClick={() => setActiveTab("bounties")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "bounties"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            <span>Ambassador Referral Payouts ({referralPlacements.length})</span>
            {referralPlacements.filter((p) => p.bountyStatus !== "paid").length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold">
                {referralPlacements.filter((p) => p.bountyStatus !== "paid").length} pending
              </span>
            )}
          </button>
        </div>

        {activeTab === "placements" && (
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs text-white outline-none focus:border-primary/80"
            >
              <option value="all" className="bg-surface-1">All BPO Clients</option>
              {billingSummary.companyBreakdown.map((c) => (
                <option key={c.company} value={c.company} className="bg-surface-1">
                  {c.company} ({c.hiresCount})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "bounties" && (
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={bountyFilter}
              onChange={(e) => setBountyFilter(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs text-white outline-none focus:border-primary/80"
            >
              <option value="all" className="bg-surface-1">All Payout Statuses</option>
              <option value="pending_review" className="bg-surface-1">🟡 Pending Review</option>
              <option value="ready_to_pay" className="bg-surface-1">🔵 Ready for Transfer</option>
              <option value="paid" className="bg-surface-1">🟢 Paid &amp; Disbursed</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Placements & Invoicing */}
      {activeTab === "placements" && (
        <div className="space-y-4">
          {/* Partner Distribution Pills */}
          <div className="flex flex-wrap gap-2.5">
            {billingSummary.companyBreakdown.map((comp) => (
              <div
                key={comp.company}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-1 px-3.5 py-2 text-xs shadow-md"
              >
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="font-bold text-white">{comp.company}:</span>
                <span className="font-mono text-primary font-extrabold">{comp.revenueEgp.toLocaleString()} EGP</span>
                <span className="text-[10px] text-muted-foreground">({comp.hiresCount} hires)</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-surface-2/60 text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3.5">Candidate / Role</th>
                    <th className="px-5 py-3.5">Partner Company</th>
                    <th className="px-5 py-3.5">Language Tier</th>
                    <th className="px-5 py-3.5">Placement Fee</th>
                    <th className="px-5 py-3.5">90-Day Guarantee</th>
                    <th className="px-5 py-3.5">Invoicing Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredPlacements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        No hired placements found.
                      </td>
                    </tr>
                  ) : (
                    filteredPlacements.map((p) => (
                      <tr key={p.candidateId} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{p.candidateName}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{p.candidatePhone}</div>
                          <div className="text-xs text-primary font-medium mt-0.5">{p.offerTitle}</div>
                        </td>

                        <td className="px-5 py-4 font-bold text-white">
                          {p.company}
                        </td>

                        <td className="px-5 py-4">
                          <span className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] border",
                            p.language === "German"
                              ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                              : p.language === "French"
                              ? "border-blue-500/30 bg-blue-500/15 text-blue-300"
                              : "border-primary/30 bg-primary/10 text-primary"
                          )}>
                            {p.language}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-white text-sm">
                          {p.placementFeeEgp.toLocaleString()} <span className="text-[10px] text-muted-foreground">EGP</span>
                        </td>

                        <td className="px-5 py-4">
                          {p.guaranteeDaysRemaining === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                              <ShieldCheck className="size-3.5" /> Guarantee Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-xs">
                              <Clock className="size-3.5" /> {p.guaranteeDaysRemaining} days left
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={p.billingStatus}
                            onChange={(e) =>
                              updateBillingMutation.mutate({
                                id: p.candidateId,
                                billing_status: e.target.value as any,
                              })
                            }
                            className={cn(
                              "rounded-xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer",
                              p.billingStatus === "collected"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : p.billingStatus === "invoiced"
                                ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                            )}
                          >
                            <option value="pending_guarantee" className="bg-surface-1">Pending Guarantee</option>
                            <option value="invoiced" className="bg-surface-1">Invoiced</option>
                            <option value="collected" className="bg-surface-1">Collected ✅</option>
                          </select>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <a
                            href={`https://wa.me/${p.candidatePhone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#25D366] transition-colors"
                          >
                            <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Ambassador Bounties */}
      {activeTab === "bounties" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-1 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-surface-2/60 text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3.5">Hired Candidate</th>
                    <th className="px-5 py-3.5">Ambassador Referral Code</th>
                    <th className="px-5 py-3.5">Role &amp; Account</th>
                    <th className="px-5 py-3.5">Bounty Amount</th>
                    <th className="px-5 py-3.5">Payout Status</th>
                    <th className="px-5 py-3.5">Payment Details</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredBounties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        No ambassador referral hires matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBounties.map((b) => (
                      <tr key={b.candidateId} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{b.candidateName}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{b.candidatePhone}</div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-lg text-xs">
                            {b.referredByCode}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{b.company}</div>
                          <div className="text-[11px] text-zinc-400">{b.offerTitle} ({b.language})</div>
                        </td>

                        <td className="px-5 py-4 font-mono font-extrabold text-white text-sm">
                          {b.ambassadorBountyEgp.toLocaleString()} <span className="text-[10px] text-primary">EGP</span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border",
                            b.bountyStatus === "paid"
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                              : b.bountyStatus === "ready_to_pay"
                              ? "border-blue-500/30 bg-blue-500/15 text-blue-300"
                              : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                          )}>
                            {b.bountyStatus === "paid" ? "🟢 Paid" : b.bountyStatus === "ready_to_pay" ? "🔵 Ready to Pay" : "🟡 Pending"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {b.bountyStatus === "paid" ? (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-bold capitalize text-white">
                                {b.bountyPaymentMethod?.replace("_", " ") || "InstaPay"}
                              </span>
                              {b.bountyTransactionRef && (
                                <div className="font-mono text-zinc-400">Ref: {b.bountyTransactionRef}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Awaiting disbursement</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right space-x-2">
                          {b.bountyStatus !== "paid" ? (
                            <button
                              onClick={() => {
                                setSelectedBountyRow(b);
                                setPayRef(`TX-${Date.now().toString().slice(-6)}`);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.25)] hover:bg-[#c2ff47] transition-all cursor-pointer"
                            >
                              <Coins className="size-3.5" /> Disburse Bounty
                            </button>
                          ) : (
                            <a
                              href={getWhatsAppNotifyUrl(b)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#25D366]/30 bg-[#25D366]/15 text-[#25D366] px-3 py-1.5 text-xs font-bold hover:bg-[#25D366]/25 transition-colors"
                            >
                              <Send className="size-3.5" /> Send Receipt
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Payout Modal */}
      {selectedBountyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-1 p-6 md:p-8 shadow-2xl border border-white/15 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-display font-bold text-lg text-white">
                Record Bounty Disbursement
              </h3>
              <button
                onClick={() => setSelectedBountyRow(null)}
                className="text-muted-foreground hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2 border border-white/10 text-xs space-y-1.5">
              <div>
                <span className="text-muted-foreground">Ambassador Code:</span>{" "}
                <strong className="font-mono text-primary font-bold">{selectedBountyRow.referredByCode}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Hired Candidate:</span>{" "}
                <strong className="text-white">{selectedBountyRow.candidateName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Bounty Amount:</span>{" "}
                <strong className="text-primary font-mono font-extrabold text-sm ml-1">
                  {selectedBountyRow.ambassadorBountyEgp.toLocaleString()} EGP
                </strong>
              </div>
            </div>

            <form onSubmit={handleRecordPayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs text-white outline-none focus:border-primary/80"
                >
                  <option value="instapay" className="bg-surface-1">InstaPay (IPN Direct)</option>
                  <option value="vodafone_cash" className="bg-surface-1">Vodafone Cash Wallet</option>
                  <option value="orange_money" className="bg-surface-1">Orange Money Wallet</option>
                  <option value="bank_transfer" className="bg-surface-1">Direct Bank Wire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Transaction Reference / Receipt ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IPN-998412 or VF-77412"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs text-white outline-none focus:border-primary/80 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedBountyRow(null)}
                  className="rounded-xl border border-white/10 bg-surface-2 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBountyMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:bg-[#c2ff47] transition-all cursor-pointer disabled:opacity-60"
                >
                  {updateBountyMutation.isPending ? "Recording..." : "Confirm & Disburse ✅"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
