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
  Filter, ShieldCheck, ChevronRight, Send, Coins, Users
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/billing")({
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
    if (!billingSummary.placements.length) {
      toast.error("No placement records to export");
      return;
    }

    const headers = [
      "Candidate Name",
      "Phone",
      "Company",
      "Role",
      "Language",
      "Hire Date",
      "Placement Fee (EGP)",
      "Invoice Status",
      "90-Day Guarantee Left (Days)",
      "Ambassador Code",
      "Bounty Payable (EGP)",
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Banknote className="size-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-ink tracking-tight">
              Agency Placement Revenue & Ambassador Bounty Ledger
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            BPO Client invoicing, 90-day retention guarantee tracking, and Vodafone Cash / InstaPay ambassador disbursements
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs self-start sm:self-auto"
        >
          <Download className="size-3.5" />
          Export Ledger CSV
        </button>
      </div>

      {/* Top 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Placement Billings</span>
            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            {billingSummary.totalGrossRevenueEgp.toLocaleString()} <span className="text-xs font-sans text-muted-foreground">EGP</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-emerald-700 font-semibold">{billingSummary.collectedRevenueEgp.toLocaleString()} EGP collected</span>
            <span>•</span>
            <span>{billingSummary.totalHiresCount} hires</span>
          </div>
        </div>

        {/* Ambassador Bounties Payable */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ambassador Bounties</span>
            <div className="size-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Coins className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-violet-700">
            {billingSummary.totalBountiesPayableEgp.toLocaleString()} <span className="text-xs font-sans text-muted-foreground">EGP</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-emerald-700 font-semibold">{billingSummary.totalBountiesPaidEgp.toLocaleString()} EGP paid</span>
            <span>•</span>
            <span className="text-amber-700 font-medium">
              {(billingSummary.totalBountiesPayableEgp - billingSummary.totalBountiesPaidEgp).toLocaleString()} EGP pending
            </span>
          </div>
        </div>

        {/* Net Placement Agency Margin */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Placement Margin</span>
            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700">
            {billingSummary.netAgencyMarginEgp.toLocaleString()} <span className="text-xs font-sans text-muted-foreground">EGP</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            <span className="text-blue-700 font-bold">{billingSummary.netMarginPercentage.toFixed(1)}%</span> net margin after referral costs
          </div>
        </div>

        {/* Ambassador Sourcing Rate */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ambassador Sourcing Share</span>
            <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {billingSummary.referralRatePercentage.toFixed(0)}%
          </div>
          <div className="text-[11px] text-muted-foreground">
            {billingSummary.referralHiresCount} of {billingSummary.totalHiresCount} hires sourced via community scouts
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border/80">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("placements")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "placements"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            BPO Client Placements & Invoicing ({billingSummary.placements.length})
          </button>
          <button
            onClick={() => setActiveTab("bounties")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "bounties"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            Ambassador Referral Payouts ({referralPlacements.length})
            {referralPlacements.filter((p) => p.bountyStatus !== "paid").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold">
                {referralPlacements.filter((p) => p.bountyStatus !== "paid").length} pending
              </span>
            )}
          </button>
        </div>

        {activeTab === "placements" && (
          <div className="flex items-center gap-2 pb-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-ink outline-none"
            >
              <option value="all">All BPO Clients</option>
              {billingSummary.companyBreakdown.map((c) => (
                <option key={c.company} value={c.company}>
                  {c.company} ({c.hiresCount})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "bounties" && (
          <div className="flex items-center gap-2 pb-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={bountyFilter}
              onChange={(e) => setBountyFilter(e.target.value as any)}
              className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-ink outline-none"
            >
              <option value="all">All Payout Statuses</option>
              <option value="pending_review">🟡 Pending Review</option>
              <option value="ready_to_pay">🔵 Ready for Transfer</option>
              <option value="paid">🟢 Paid & Disbursed</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Placements & Invoicing */}
      {activeTab === "placements" && (
        <div className="space-y-4">
          {/* Partner Distribution Pills */}
          <div className="flex flex-wrap gap-2">
            {billingSummary.companyBreakdown.map((comp) => (
              <div
                key={comp.company}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-xs shadow-2xs"
              >
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-ink">{comp.company}:</span>
                <span className="font-mono text-primary font-bold">{comp.revenueEgp.toLocaleString()} EGP</span>
                <span className="text-[10px] text-muted-foreground font-medium">({comp.hiresCount} hires)</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-[#fbfbfc] text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Candidate / Role</th>
                    <th className="px-4 py-3">Partner Company</th>
                    <th className="px-4 py-3">Language Tier</th>
                    <th className="px-4 py-3">Placement Fee</th>
                    <th className="px-4 py-3">90-Day Guarantee</th>
                    <th className="px-4 py-3">Invoicing Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPlacements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No hired placements found.
                      </td>
                    </tr>
                  ) : (
                    filteredPlacements.map((p) => (
                      <tr key={p.candidateId} className="hover:bg-sand/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-ink">{p.candidateName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{p.candidatePhone}</div>
                          <div className="text-[11px] text-primary font-medium">{p.offerTitle}</div>
                        </td>

                        <td className="px-4 py-3 font-semibold text-ink">
                          {p.company}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            p.language === "German"
                              ? "bg-amber-100 text-amber-800"
                              : p.language === "French"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {p.language}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-ink text-sm">
                          {p.placementFeeEgp.toLocaleString()} <span className="text-[10px] text-muted-foreground">EGP</span>
                        </td>

                        <td className="px-4 py-3">
                          {p.guaranteeDaysRemaining === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <ShieldCheck className="size-3.5" /> Guarantee Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-[11px]">
                              <Clock className="size-3.5" /> {p.guaranteeDaysRemaining} days remaining
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={p.billingStatus}
                            onChange={(e) =>
                              updateBillingMutation.mutate({
                                id: p.candidateId,
                                billing_status: e.target.value as any,
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer ${
                              p.billingStatus === "collected"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : p.billingStatus === "invoiced"
                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            }`}
                          >
                            <option value="pending_guarantee">Pending Guarantee</option>
                            <option value="invoiced">Invoiced</option>
                            <option value="collected">Collected ✅</option>
                          </select>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <a
                            href={`https://wa.me/${p.candidatePhone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#25D366] transition-colors"
                          >
                            <MessageCircle className="size-3.5" /> WhatsApp
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
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-[#fbfbfc] text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Hired Candidate</th>
                    <th className="px-4 py-3">Ambassador Referral Code</th>
                    <th className="px-4 py-3">Role & Account</th>
                    <th className="px-4 py-3">Bounty Amount</th>
                    <th className="px-4 py-3">Payout Status</th>
                    <th className="px-4 py-3">Payment Details</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBounties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No ambassador referral hires matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBounties.map((b) => (
                      <tr key={b.candidateId} className="hover:bg-sand/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-ink">{b.candidateName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{b.candidatePhone}</div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-lg text-xs">
                            {b.referredByCode}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">{b.company}</div>
                          <div className="text-[11px] text-muted-foreground">{b.offerTitle} ({b.language})</div>
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-ink text-sm">
                          {b.ambassadorBountyEgp.toLocaleString()} <span className="text-[10px] text-muted-foreground">EGP</span>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            b.bountyStatus === "paid"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : b.bountyStatus === "ready_to_pay"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            {b.bountyStatus === "paid" ? "🟢 Paid" : b.bountyStatus === "ready_to_pay" ? "🔵 Ready to Pay" : "🟡 Pending"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {b.bountyStatus === "paid" ? (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-medium capitalize text-slate-800">
                                {b.bountyPaymentMethod?.replace("_", " ") || "InstaPay"}
                              </span>
                              {b.bountyTransactionRef && (
                                <div className="font-mono text-muted-foreground">Ref: {b.bountyTransactionRef}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Awaiting disbursement</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right space-x-2">
                          {b.bountyStatus !== "paid" ? (
                            <button
                              onClick={() => {
                                setSelectedBountyRow(b);
                                setPayRef(`TX-${Date.now().toString().slice(-6)}`);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                            >
                              <Coins className="size-3" /> Mark Paid
                            </button>
                          ) : (
                            <a
                              href={getWhatsAppNotifyUrl(b)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/10 text-[#128C7E] px-2.5 py-1 text-xs font-semibold hover:bg-[#25D366]/20 transition-colors"
                            >
                              <Send className="size-3" /> Send WhatsApp Receipt
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-ink">
                Record Ambassador Bounty Disbursement
              </h3>
              <button
                onClick={() => setSelectedBountyRow(null)}
                className="text-muted-foreground hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Ambassador Referral Code:</span>{" "}
                <strong className="font-mono text-violet-800">{selectedBountyRow.referredByCode}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Hired Candidate:</span>{" "}
                <strong className="text-ink">{selectedBountyRow.candidateName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Bounty Amount:</span>{" "}
                <strong className="text-emerald-700 font-mono font-bold text-sm">
                  {selectedBountyRow.ambassadorBountyEgp.toLocaleString()} EGP
                </strong>
              </div>
            </div>

            <form onSubmit={handleRecordPayoutSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none"
                >
                  <option value="instapay">InstaPay (IPN)</option>
                  <option value="vodafone_cash">Vodafone Cash Wallet</option>
                  <option value="orange_money">Orange Money Wallet</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Transaction Reference / Receipt ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IPN-998412 or VF-77412"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBountyRow(null)}
                  className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBountyMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  {updateBountyMutation.isPending ? "Recording..." : "Confirm Payout ✅"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
