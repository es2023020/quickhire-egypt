import type { AdminApplicationRow } from "./applications.functions";

export interface PlacementBillingRow {
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  candidateEmail: string;
  offerTitle: string;
  offerSlug: string;
  company: string;
  language: string;
  hiredDate: string;
  placementFeeEgp: number;
  billingStatus: "pending_guarantee" | "invoiced" | "collected";
  guaranteeDaysRemaining: number;
  // Ambassador referral info
  referredByCode: string | null;
  ambassadorBountyEgp: number;
  bountyStatus: "pending_review" | "ready_to_pay" | "paid";
  bountyPaymentMethod: "vodafone_cash" | "instapay" | "orange_money" | "bank_transfer" | null;
  bountyTransactionRef: string | null;
  bountyPaidAt: string | null;
}

export interface BillingSummary {
  totalGrossRevenueEgp: number;
  totalBountiesPayableEgp: number;
  totalBountiesPaidEgp: number;
  netAgencyMarginEgp: number;
  netMarginPercentage: number;
  totalHiresCount: number;
  referralHiresCount: number;
  referralRatePercentage: number;
  collectedRevenueEgp: number;
  invoicedRevenueEgp: number;
  pendingRevenueEgp: number;
  placements: PlacementBillingRow[];
  companyBreakdown: { company: string; hiresCount: number; revenueEgp: number }[];
  languageBreakdown: { language: string; hiresCount: number; revenueEgp: number }[];
}

/**
 * Standard Placement Fees charged to BPO accounts in Egypt:
 * - German / Dutch / Swedish: ~22,000 EGP per hire
 * - French / Italian / Spanish: ~14,000 EGP per hire
 * - English B2/C1 Account: ~5,000 EGP per hire
 * - Arabic / Domestic Telesales: ~3,000 EGP per hire
 */
export function calculateAgencyPlacementFee(offerTitle: string, company: string, language?: string | null): { fee: number; tier: string } {
  const lang = (language || "").toLowerCase();
  const title = offerTitle.toLowerCase();

  if (lang.includes("german") || lang.includes("deutsch") || title.includes("german") || title.includes("dutch")) {
    return { fee: 22000, tier: "German / High-Value European Tier" };
  }
  if (lang.includes("french") || lang.includes("français") || title.includes("french") || lang.includes("italian") || title.includes("italian")) {
    return { fee: 14000, tier: "French / Southern European Tier" };
  }
  if (lang.includes("arabic") || title.includes("arabic") || title.includes("عربي")) {
    return { fee: 3000, tier: "Arabic Domestic Account" };
  }
  // Default BPO English Tier
  return { fee: 5000, tier: "BPO English Account" };
}

/**
 * Ambassador Bounty payable to community scouts / candidates:
 * - Multilingual (German, French, Italian, Dutch): 2,500 EGP
 * - English / Other: 1,000 EGP
 */
export function calculateAmbassadorBounty(offerTitle: string, language?: string | null): number {
  const lang = (language || "").toLowerCase();
  const title = offerTitle.toLowerCase();
  if (
    lang.includes("german") ||
    lang.includes("french") ||
    lang.includes("italian") ||
    lang.includes("dutch") ||
    title.includes("german") ||
    title.includes("french") ||
    title.includes("italian")
  ) {
    return 2500;
  }
  return 1000;
}

export function buildBillingSummary(apps: AdminApplicationRow[]): BillingSummary {
  // Only hired candidates generate billable placement revenue
  const hiredApps = apps.filter((a) => a.status === "hired" || a.outcome_code === "passed_offer");

  let totalGrossRevenueEgp = 0;
  let totalBountiesPayableEgp = 0;
  let totalBountiesPaidEgp = 0;
  let referralHiresCount = 0;
  let collectedRevenueEgp = 0;
  let invoicedRevenueEgp = 0;
  let pendingRevenueEgp = 0;

  const companyMap = new Map<string, { hiresCount: number; revenueEgp: number }>();
  const languageMap = new Map<string, { hiresCount: number; revenueEgp: number }>();

  const placements: PlacementBillingRow[] = hiredApps.map((a) => {
    const offerTitle = a.offer?.title || "Customer Service Representative";
    const company = a.offer?.company || "BPO Partner";
    
    // Guess language from title or voice notes
    let language = "English";
    if (offerTitle.toLowerCase().includes("french") || (a.voice_notes && a.voice_notes.some(v => v.lang.toLowerCase() === "french"))) {
      language = "French";
    } else if (offerTitle.toLowerCase().includes("german") || (a.voice_notes && a.voice_notes.some(v => v.lang.toLowerCase() === "german"))) {
      language = "German";
    } else if (offerTitle.toLowerCase().includes("arabic") || (a.voice_notes && a.voice_notes.some(v => v.lang.toLowerCase() === "arabic"))) {
      language = "Arabic";
    }

    const { fee } = calculateAgencyPlacementFee(offerTitle, company, language);
    totalGrossRevenueEgp += fee;

    const billingStatus = a.billing_status || "pending_guarantee";
    if (billingStatus === "collected") collectedRevenueEgp += fee;
    else if (billingStatus === "invoiced") invoicedRevenueEgp += fee;
    else pendingRevenueEgp += fee;

    // Guarantee period: standard 90 days from hire/created date
    const hiredDate = a.created_at;
    const daysSinceHire = Math.max(0, Math.floor((Date.now() - new Date(hiredDate).getTime()) / (1000 * 60 * 60 * 24)));
    const guaranteeDaysRemaining = Math.max(0, 90 - daysSinceHire);

    // Referral Bounty
    let bountyEgp = 0;
    const hasReferral = Boolean(a.referred_by && a.referred_by.trim());
    if (hasReferral) {
      referralHiresCount++;
      bountyEgp = calculateAmbassadorBounty(offerTitle, language);
      totalBountiesPayableEgp += bountyEgp;

      if (a.bounty_status === "paid") {
        totalBountiesPaidEgp += bountyEgp;
      }
    }

    // Company breakdown
    const existingComp = companyMap.get(company) || { hiresCount: 0, revenueEgp: 0 };
    companyMap.set(company, {
      hiresCount: existingComp.hiresCount + 1,
      revenueEgp: existingComp.revenueEgp + fee,
    });

    // Language breakdown
    const existingLang = languageMap.get(language) || { hiresCount: 0, revenueEgp: 0 };
    languageMap.set(language, {
      hiresCount: existingLang.hiresCount + 1,
      revenueEgp: existingLang.revenueEgp + fee,
    });

    return {
      candidateId: a.id,
      candidateName: a.full_name,
      candidatePhone: a.phone,
      candidateEmail: a.email,
      offerTitle,
      offerSlug: a.offer?.slug || "",
      company,
      language,
      hiredDate,
      placementFeeEgp: fee,
      billingStatus,
      guaranteeDaysRemaining,
      referredByCode: a.referred_by || null,
      ambassadorBountyEgp: bountyEgp,
      bountyStatus: a.bounty_status || (hasReferral ? "pending_review" : "pending_review"),
      bountyPaymentMethod: a.bounty_payment_method || null,
      bountyTransactionRef: a.bounty_transaction_ref || null,
      bountyPaidAt: a.bounty_paid_at || null,
    };
  });

  const netAgencyMarginEgp = totalGrossRevenueEgp - totalBountiesPayableEgp;
  const netMarginPercentage = totalGrossRevenueEgp > 0 ? (netAgencyMarginEgp / totalGrossRevenueEgp) * 100 : 0;
  const referralRatePercentage = hiredApps.length > 0 ? (referralHiresCount / hiredApps.length) * 100 : 0;

  return {
    totalGrossRevenueEgp,
    totalBountiesPayableEgp,
    totalBountiesPaidEgp,
    netAgencyMarginEgp,
    netMarginPercentage,
    totalHiresCount: hiredApps.length,
    referralHiresCount,
    referralRatePercentage,
    collectedRevenueEgp,
    invoicedRevenueEgp,
    pendingRevenueEgp,
    placements,
    companyBreakdown: Array.from(companyMap.entries()).map(([company, val]) => ({
      company,
      hiresCount: val.hiresCount,
      revenueEgp: val.revenueEgp,
    })),
    languageBreakdown: Array.from(languageMap.entries()).map(([language, val]) => ({
      language,
      hiresCount: val.hiresCount,
      revenueEgp: val.revenueEgp,
    })),
  };
}
