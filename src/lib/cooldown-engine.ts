/**
 * 90-Day BPO Client Cooldown & Re-Hire Guardrail Engine
 * Protects agency credibility and prevents candidate turnaways at client security gates.
 * Egyptian BPO clients (Concentrix, Vodafone, Sutherland, Raya, Teleperformance, etc.)
 * strictly enforce a 90 to 180 day cooldown window on prior employees or recent applicants.
 */

import type { MockApplication } from "./data";
import type { AdminApplicationRow } from "./applications.functions";

export interface CooldownCheckResult {
  hasCooldownRisk: boolean;
  severity: "high" | "warning" | "clear";
  reason: string | null;
  companyName: string;
  priorAppDate?: string | null;
  daysAgo?: number | null;
  recommendedAction?: string | null;
}

export function checkCandidateCooldown(
  currentApp: {
    id: string;
    phone: string;
    email: string;
    created_at: string;
    answers?: Record<string, unknown> | null;
    offer?: { company?: string; title?: string } | null;
    offer_id?: string;
  },
  allApplications: (MockApplication | AdminApplicationRow)[]
): CooldownCheckResult {
  const company = currentApp.offer?.company || "Target Company";
  const answers = currentApp.answers || {};

  // 1. Check self-reported history from application form questions
  const workedBefore = String(
    answers.worked_before_at_company || ""
  ).trim().toLowerCase();

  const contactedHr = String(
    answers.contacted_hr_before || ""
  ).trim().toLowerCase();

  if (
    workedBefore === "yes" ||
    workedBefore.includes("worked") ||
    workedBefore.includes("employed")
  ) {
    return {
      hasCooldownRisk: true,
      severity: "high",
      reason: `Self-declared: Previously worked at ${company}. BPO clients require official re-hire clearance or a minimum 6-month cooldown.`,
      companyName: company,
      recommendedAction: `Use Smart Account Pooling to fast-track candidate to an alternative BPO account where they have no prior history.`,
    };
  }

  if (
    contactedHr === "yes" ||
    contactedHr.includes("interviewed") ||
    contactedHr.includes("3 months") ||
    contactedHr.includes("6 months")
  ) {
    return {
      hasCooldownRisk: true,
      severity: "warning",
      reason: `Self-declared: Recently interviewed or in touch with ${company} HR within the last 90–180 days.`,
      companyName: company,
      recommendedAction: `Verify interview outcome with client coordinator before scheduling an on-site slot.`,
    };
  }

  // 2. Check historical application records for duplicate submissions to the same company within 90 days
  const currentPhone = currentApp.phone.replace(/[^0-9]/g, "").slice(-9); // match last 9 digits (handles 010... and +2010...)
  const currentEmail = currentApp.email.toLowerCase().trim();
  const currentCreatedTime = new Date(currentApp.created_at).getTime();

  for (const other of allApplications) {
    if (other.id === currentApp.id) continue;

    const otherCompany = other.offer?.company || "";
    // Only check if other application was for the same client company
    if (otherCompany && company && otherCompany.toLowerCase() === company.toLowerCase()) {
      const otherPhone = (other.phone || "").replace(/[^0-9]/g, "").slice(-9);
      const otherEmail = (other.email || "").toLowerCase().trim();

      const isSameCandidate =
        (currentPhone && otherPhone && currentPhone === otherPhone) ||
        (currentEmail && otherEmail && currentEmail === otherEmail);

      if (isSameCandidate) {
        const otherCreatedTime = new Date(other.created_at).getTime();
        const diffMs = Math.abs(currentCreatedTime - otherCreatedTime);
        const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysAgo <= 90) {
          return {
            hasCooldownRisk: true,
            severity: "high",
            reason: `Duplicate submission: Candidate previously applied to ${company} ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago (${new Date(other.created_at).toLocaleDateString("en-GB")}). Client enforces a 90-day cooldown window.`,
            companyName: company,
            priorAppDate: other.created_at,
            daysAgo,
            recommendedAction: `Re-route candidate to an alternative partner (e.g. Alorica, Concentrix, or Sutherland) to avoid gate rejection.`,
          };
        }
      }
    }
  }

  return {
    hasCooldownRisk: false,
    severity: "clear",
    reason: null,
    companyName: company,
  };
}
