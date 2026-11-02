/**
 * Smart Account Pooling & Re-Routing Engine
 * Ensures 0% candidate wastage by automatically routing applicants to alternative
 * open BPO & Sales waves based on language proficiency (CEFR/Scores), location, and salary.
 */

import type { OfferWithPhone } from "./offers.types";

export type PooledMatch = {
  offer: OfferWithPhone;
  matchScore: number; // 0 to 100
  tier: "C1" | "B2" | "B1" | "General";
  matchReasons: string[];
  fastTrackEligible: boolean;
};

export type CandidateProfileSummary = {
  englishScore: number | null; // 0 to 10
  englishLevel: string | null;  // e.g. "B2", "C1", "A2"
  location: string | null;
  experienceYears: number | null;
  salaryExpectation: string | null;
  currentOfferId: string;
};

/**
 * Determines approximate CEFR tier from applicant score and self-assessment
 */
export function getCandidateCefrTier(score: number | null, declaredLevel: string | null): "C2" | "C1" | "B2" | "B1" | "A2" {
  if (score != null) {
    if (score >= 9) return "C1";
    if (score >= 7) return "B2";
    if (score >= 5) return "B1";
    return "A2";
  }
  const dl = (declaredLevel || "").toLowerCase();
  if (dl.includes("c2")) return "C2";
  if (dl.includes("c1") || dl.includes("advanced") || dl.includes("fluent")) return "C1";
  if (dl.includes("b2") || dl.includes("upper")) return "B2";
  if (dl.includes("b1") || dl.includes("intermediate")) return "B1";
  return "B2"; // default
}

/**
 * Determines required CEFR level from an offer title and description
 */
export function getOfferRequiredCefr(offer: OfferWithPhone): "C1" | "B2" | "B1" {
  const text = `${offer.title} ${offer.description || ""} ${offer.requirements?.join(" ") || ""}`.toLowerCase();
  if (text.includes("c1") || text.includes("fluent english") || text.includes("native") || text.includes("uk account") || text.includes("financial")) {
    return "C1";
  }
  if (text.includes("b1") || text.includes("good english")) {
    return "B1";
  }
  return "B2";
}

/**
 * Calculate pooled match recommendations for an applicant across all active job offers
 */
export function calculateSmartPoolMatches(
  candidate: CandidateProfileSummary,
  allOffers: OfferWithPhone[]
): PooledMatch[] {
  const candidateTier = getCandidateCefrTier(candidate.englishScore, candidate.englishLevel);

  // Filter out current offer, and offers on hold
  const availableOffers = allOffers.filter(
    (o) => o.id !== candidate.currentOfferId && o.status !== "on_hold"
  );

  const results: PooledMatch[] = [];

  for (const offer of availableOffers) {
    const offerTier = getOfferRequiredCefr(offer);
    const reasons: string[] = [];
    let score = 70; // baseline for active open wave

    // 1. Language Tier Matching
    if (candidateTier === "C1" || candidateTier === "C2") {
      if (offerTier === "C1") {
        score += 20;
        reasons.push("Candidate C1/Fluent English perfectly qualifies for this premier account tier");
      } else {
        score += 15;
        reasons.push("Candidate English exceeds tier requirement — instant fast-track approval");
      }
    } else if (candidateTier === "B2") {
      if (offerTier === "B2") {
        score += 25;
        reasons.push("Candidate B2 fluency matches this account's language profile perfectly");
      } else if (offerTier === "C1") {
        score -= 10;
        reasons.push("Requires high B2+ delivery — good candidate for interview assessment");
      } else {
        score += 15;
        reasons.push("Easily qualifies for this communication standard");
      }
    } else {
      // B1 or below
      if (offerTier === "B1") {
        score += 20;
        reasons.push("Matches entry-level communication requirement");
      } else {
        score -= 20;
      }
    }

    // 2. Location & Transportation Hub Matching
    const candLoc = (candidate.location || "").toLowerCase();
    const offLoc = (offer.location || "").toLowerCase();
    if (candLoc && offLoc) {
      if (
        (candLoc.includes("maadi") && offLoc.includes("maadi")) ||
        (candLoc.includes("october") && offLoc.includes("october")) ||
        (candLoc.includes("zayed") && offLoc.includes("smart village")) ||
        (candLoc.includes("new cairo") && offLoc.includes("new cairo")) ||
        (candLoc.includes("nasr city") && offLoc.includes("new cairo"))
      ) {
        score += 10;
        reasons.push(`Commute match: Candidate in ${candidate.location} is close to site (${offer.location})`);
      }
    }

    // 3. Experience matching
    if (candidate.experienceYears != null && candidate.experienceYears > 1) {
      score += 5;
      reasons.push(`Has ${candidate.experienceYears} year(s) proven BPO/sales experience`);
    }

    const finalScore = Math.min(99, Math.max(50, score));

    results.push({
      offer,
      matchScore: finalScore,
      tier: offerTier,
      matchReasons: reasons,
      fastTrackEligible: finalScore >= 80,
    });
  }

  // Sort descending by match score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * WhatsApp message sent when a candidate is re-routed & fast-tracked into an alternative wave
 */
export function buildRerouteWhatsAppInvite(
  candidateName: string,
  targetRole: string,
  targetCompany: string,
  salaryText?: string,
  reasonSummary?: string
): string {
  const sal = salaryText ? ` offering *${salaryText}*` : "";
  const reason = reasonSummary ? `\n• *Why you were chosen:* ${reasonSummary}\n` : "";

  return [
    `🌟 *FAST-TRACK OPPORTUNITY: QuickHire Talent Match*`,
    ``,
    `Hi *${candidateName}*,`,
    `Great news from the QuickHire recruitment team! 🎉`,
    ``,
    `While reviewing your language and communication evaluation, our AI recruitment team found that your profile is an *EXCEPTIONAL MATCH* for the *${targetRole}* wave at *${targetCompany}*${sal}!`,
    reason,
    `We have *fast-tracked* your application directly to the priority shortlist for this Sunday's interview wave.`,
    ``,
    `👉 *Would you like us to lock your interview slot for this account?*`,
    `Please reply with *"YES"* and we will send your schedule, shuttle bus stop, and gate pass details immediately!`,
    ``,
    `Best regards,`,
    `*Career Community / QuickHire Talent Team 🇪🇬*`,
  ].join("\n");
}
