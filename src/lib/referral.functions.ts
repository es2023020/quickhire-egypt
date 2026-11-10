// QuickHire Full-Stack Referral & Ambassador Core Engine
import { MOCK_APPLICATIONS, BUILT_IN_OFFERS, type MockApplication } from "./data";
import { LANGUAGE_BOUNTIES, generateCandidateReferralCode, buildCandidateShareUrl, buildCandidateReferralShareMessage } from "./referral-engine";

export interface AmbassadorAccount {
  id: string;
  name: string;
  phone: string;
  email?: string;
  referral_code: string;
  payout_method: "vodafone_cash" | "instapay" | "orange_money" | "bank_transfer";
  payout_account: string;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  ambassador_code: string;
  ambassador_name: string;
  phone: string;
  amount: number;
  method: string;
  wallet: string;
  status: "pending" | "processing" | "paid" | "declined";
  created_at: string;
  transaction_ref?: string | null;
}

export interface ReferredCandidateItem {
  id: string;
  nameMasked: string;
  offerTitle: string;
  company: string;
  language: string;
  status: string;
  stageLabel: string;
  appliedAt: string;
  bountyEgp: number;
  isEligible: boolean; // hired or accepted
  bountyStatus: "pending_review" | "ready_to_pay" | "paid";
}

export interface AmbassadorDashboardData {
  ambassador: AmbassadorAccount;
  shareUrl: string;
  shareMessage: string;
  metrics: {
    totalReferred: number;
    inPipeline: number;
    placedCount: number;
    totalEarned: number;
    paidOut: number;
    availableBalance: number;
  };
  referrals: ReferredCandidateItem[];
  payouts: PayoutRequest[];
}

const STORAGE_KEY_AMBASSADORS = "qh_ambassadors_v1";
const STORAGE_KEY_PAYOUTS = "qh_payout_requests_v1";

// Demo ambassadors for instant preview
const DEMO_AMBASSADORS: AmbassadorAccount[] = [
  {
    id: "amb-1",
    name: "Omar Khaled",
    phone: "01029324783",
    email: "omar.khaled@example.com",
    referral_code: "REF-OMAR-4783",
    payout_method: "instapay",
    payout_account: "omar@instapay",
    created_at: "2026-10-01T10:00:00Z",
  },
  {
    id: "amb-2",
    name: "Sarah Mansour",
    phone: "01155443322",
    email: "sarah.m@example.com",
    referral_code: "REF-SARAH-3322",
    payout_method: "vodafone_cash",
    payout_account: "01099887766",
    created_at: "2026-10-15T12:00:00Z",
  },
];

// Helper to determine bounty by role & language
export function getBountyForOffer(offer?: { title?: string; language?: string | null } | null): number {
  if (!offer) return 1000;
  const lang = (offer.language || "").toLowerCase();
  const title = (offer.title || "").toLowerCase();

  if (lang.includes("german") || title.includes("german") || title.includes("ألماني")) return 3000;
  if (lang.includes("dutch") || title.includes("dutch") || title.includes("هولندي")) return 3500;
  if (lang.includes("french") || title.includes("french") || title.includes("فرنساوي")) return 2500;
  if (lang.includes("italian") || title.includes("italian") || title.includes("إيطالي")) return 2000;
  return 1000; // Standard English / Sales bounty
}

function getStoredAmbassadors(): AmbassadorAccount[] {
  if (typeof window === "undefined") return [...DEMO_AMBASSADORS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AMBASSADORS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AMBASSADORS, JSON.stringify(DEMO_AMBASSADORS));
      return [...DEMO_AMBASSADORS];
    }
    return JSON.parse(raw) as AmbassadorAccount[];
  } catch {
    return [...DEMO_AMBASSADORS];
  }
}

function saveAmbassadors(list: AmbassadorAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_AMBASSADORS, JSON.stringify(list));
}

function getStoredPayouts(): PayoutRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYOUTS);
    if (!raw) return [];
    return JSON.parse(raw) as PayoutRequest[];
  } catch {
    return [];
  }
}

function savePayouts(list: PayoutRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PAYOUTS, JSON.stringify(list));
}

async function getLiveApplications(): Promise<MockApplication[]> {
  if (typeof window === "undefined") return [...MOCK_APPLICATIONS];
  try {
    const raw = localStorage.getItem("qh_applications_v2");
    if (!raw) return [...MOCK_APPLICATIONS];
    return JSON.parse(raw) as MockApplication[];
  } catch {
    return [...MOCK_APPLICATIONS];
  }
}

/**
 * Register or look up an Ambassador profile
 */
export async function registerOrGetAmbassador({
  name,
  phone,
  email,
  payout_method = "instapay",
  payout_account,
}: {
  name: string;
  phone: string;
  email?: string;
  payout_method?: "vodafone_cash" | "instapay" | "orange_money" | "bank_transfer";
  payout_account?: string;
}): Promise<AmbassadorAccount> {
  const ambassadors = getStoredAmbassadors();
  const applications = await getLiveApplications();
  const cleanPhone = phone.replace(/[^0-9]/g, "");

  const existing = ambassadors.find(
    (a) => a.phone.replace(/[^0-9]/g, "") === cleanPhone || (email && a.email?.toLowerCase() === email.toLowerCase())
  );

  if (existing) {
    if (payout_account && payout_account !== existing.payout_account) {
      existing.payout_account = payout_account;
      existing.payout_method = payout_method;
      saveAmbassadors(ambassadors);
    }
    return existing;
  }

  // Gather all existing codes from ambassadors and applicants to guarantee complete uniqueness
  const existingCodes = [
    ...ambassadors.map((a) => a.referral_code),
    ...applications.map((app) => app.referral_code).filter(Boolean) as string[],
  ];

  const refCode = generateCandidateReferralCode(name, cleanPhone, existingCodes);
  const newAmbassador: AmbassadorAccount = {
    id: `amb-${Date.now()}`,
    name: name.trim(),
    phone: cleanPhone,
    email: email?.trim(),
    referral_code: refCode,
    payout_method,
    payout_account: payout_account || cleanPhone,
    created_at: new Date().toISOString(),
  };

  ambassadors.unshift(newAmbassador);
  saveAmbassadors(ambassadors);
  return newAmbassador;
}

/**
 * Fetch full dashboard stats & referred applicants for an Ambassador
 */
export async function getAmbassadorDashboard(queryCodeOrPhone: string): Promise<AmbassadorDashboardData | null> {
  const rawQuery = (queryCodeOrPhone || "").trim();
  if (!rawQuery) return null;

  const queryUpper = rawQuery.toUpperCase();
  const cleanPhone = rawQuery.replace(/[^0-9]/g, "");

  const ambassadors = getStoredAmbassadors();
  const applications = await getLiveApplications();

  // 1. Look up in ambassadors list
  let amb = ambassadors.find((a) => {
    const aCleanPhone = a.phone.replace(/[^0-9]/g, "");
    return (
      a.referral_code.toUpperCase() === queryUpper ||
      (queryUpper.startsWith("REF-") && a.referral_code.toUpperCase().replace("REF-", "") === queryUpper.replace("REF-", "")) ||
      (!queryUpper.startsWith("REF-") && a.referral_code.toUpperCase() === `REF-${queryUpper}`) ||
      (cleanPhone.length >= 8 && aCleanPhone.endsWith(cleanPhone.slice(-8))) ||
      (a.email && a.email.toUpperCase() === queryUpper)
    );
  });

  // 2. If not found in ambassadors, check applicants who applied
  if (!amb) {
    const candidateApp = applications.find((app) => {
      const appCleanPhone = app.phone ? app.phone.replace(/[^0-9]/g, "") : "";
      return (
        (app.referral_code && app.referral_code.toUpperCase() === queryUpper) ||
        (queryUpper.startsWith("REF-") && app.referral_code && app.referral_code.toUpperCase().replace("REF-", "") === queryUpper.replace("REF-", "")) ||
        (!queryUpper.startsWith("REF-") && app.referral_code && app.referral_code.toUpperCase() === `REF-${queryUpper}`) ||
        (cleanPhone.length >= 8 && appCleanPhone.endsWith(cleanPhone.slice(-8))) ||
        (app.email && app.email.toUpperCase() === queryUpper)
      );
    });

    if (candidateApp) {
      const existingCodes = [
        ...ambassadors.map((a) => a.referral_code),
        ...applications.map((app) => app.referral_code).filter(Boolean) as string[],
      ];
      const assignedCode = candidateApp.referral_code || generateCandidateReferralCode(candidateApp.full_name, candidateApp.phone, existingCodes);
      amb = {
        id: `amb-cand-${candidateApp.id}`,
        name: candidateApp.full_name,
        phone: candidateApp.phone.replace(/[^0-9]/g, ""),
        email: candidateApp.email,
        referral_code: assignedCode,
        payout_method: "instapay",
        payout_account: candidateApp.phone,
        created_at: candidateApp.created_at || new Date().toISOString(),
      };
      ambassadors.push(amb);
      saveAmbassadors(ambassadors);
    }
  }

  // 3. Fallback: If user entered a valid format REF-NAME-CODE or REF-..., auto register
  if (!amb && (queryUpper.startsWith("REF-") || queryUpper.includes("-"))) {
    const code = queryUpper.startsWith("REF-") ? queryUpper : `REF-${queryUpper}`;
    const namePart = code.replace("REF-", "").split("-")[0] || "Ambassador";
    amb = {
      id: `amb-auto-${Date.now()}`,
      name: namePart,
      phone: cleanPhone || "01000000000",
      referral_code: code,
      payout_method: "instapay",
      payout_account: "Pending Details",
      created_at: new Date().toISOString(),
    };
    ambassadors.push(amb);
    saveAmbassadors(ambassadors);
  }

  if (!amb) return null;

  const payouts = getStoredPayouts().filter((p) => p.ambassador_code === amb.referral_code);

  // Find all applications referred by this code
  const ambCleanPhone = amb.phone.replace(/[^0-9]/g, "");
  const ambCode = amb.referral_code.toUpperCase();

  const matchedApps = applications.filter((app) => {
    const ref = (app.referred_by || "").trim().toUpperCase();
    if (!ref) return false;
    return (
      ref === ambCode ||
      ref.replace("REF-", "") === ambCode.replace("REF-", "") ||
      (ambCleanPhone.length >= 8 && ref.includes(ambCleanPhone.slice(-8)))
    );
  });

  // Calculate stats
  let totalEarned = 0;
  let placedCount = 0;
  let inPipeline = 0;

  const referrals: ReferredCandidateItem[] = matchedApps.map((app) => {
    const offer = BUILT_IN_OFFERS.find((o) => o.id === app.offer_id) || app.offer;
    const bountyEgp = getBountyForOffer(offer);

    const isHired =
      app.status === "hired" ||
      app.pipeline_stage === "accepted" ||
      app.pipeline_stage === "offer_extended";

    if (isHired) {
      totalEarned += bountyEgp;
      placedCount++;
    } else {
      inPipeline++;
    }

    // Candidate privacy name masking: "Mohamed A."
    const parts = app.full_name.trim().split(" ");
    const nameMasked = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];

    const stageLabels: Record<string, string> = {
      applied: "CV & Voice Under Review",
      test_invited: "Invited to Language Test",
      test_completed: "Assessment Scored",
      interview_scheduled: "Interview Scheduled",
      interview_done: "Final HR Evaluation",
      offer_pending: "Offer Drafting",
      offer_extended: "Offer Extended 🎉",
      accepted: "Placed & Hired 🚀",
      rejected: "Archived to Pool",
    };

    return {
      id: app.id,
      nameMasked,
      offerTitle: offer?.title || "Sales & Support Specialist",
      company: offer?.company || "Hiring Partner",
      language: offer?.language || "English",
      status: app.status,
      stageLabel: stageLabels[app.pipeline_stage || ""] || "Under Review",
      appliedAt: app.created_at,
      bountyEgp,
      isEligible: isHired,
      bountyStatus: isHired ? "ready_to_pay" : "pending_review",
    };
  });

  const paidOut = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const requestedPending = payouts.filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + p.amount, 0);
  const availableBalance = Math.max(0, totalEarned - paidOut - requestedPending);

  const shareUrl = buildCandidateShareUrl(amb.referral_code);
  const shareMessage = buildCandidateReferralShareMessage({
    referrerName: amb.name,
    code: amb.referral_code,
    shareUrl,
  });

  return {
    ambassador: amb,
    shareUrl,
    shareMessage,
    metrics: {
      totalReferred: matchedApps.length,
      inPipeline,
      placedCount,
      totalEarned,
      paidOut,
      availableBalance,
    },
    referrals,
    payouts,
  };
}

/**
 * Submit Payout Request
 */
export async function submitPayoutRequest({
  refCode,
  amount,
  paymentMethod,
  walletNumber,
}: {
  refCode: string;
  amount: number;
  paymentMethod: string;
  walletNumber: string;
}): Promise<PayoutRequest> {
  const payouts = getStoredPayouts();
  const ambassadors = getStoredAmbassadors();
  const amb = ambassadors.find((a) => a.referral_code === refCode);

  const newPayout: PayoutRequest = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ambassador_code: refCode,
    ambassador_name: amb?.name || "Ambassador",
    phone: amb?.phone || walletNumber,
    amount,
    method: paymentMethod,
    wallet: walletNumber,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  payouts.unshift(newPayout);
  savePayouts(payouts);
  return newPayout;
}
