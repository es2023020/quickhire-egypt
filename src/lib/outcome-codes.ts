/**
 * Granular BPO Assessment Outcome & Feedback Codes
 * Critical for client interview tracking and feeding the Smart Pooling engine.
 */

export interface OutcomeCodeDefinition {
  code: string;
  label: string;
  shortLabel: string;
  category: "pass" | "fail" | "declined" | "no_show";
  defaultStatus: "hired" | "shortlisted" | "rejected";
  badgeStyle: string;
  description: string;
  smartPoolAction: string;
}

export const OUTCOME_CODES: OutcomeCodeDefinition[] = [
  {
    code: "passed_offer",
    label: "Passed Assessment — Offer Extended",
    shortLabel: "Offer Extended 🎉",
    category: "pass",
    defaultStatus: "hired",
    badgeStyle: "bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_rgba(182,255,46,0.15)]",
    description: "Candidate successfully passed V&A, Ops, and client interview. Contract offered.",
    smartPoolAction: "No pooling needed. Marked as Hired.",
  },
  {
    code: "passed_backup",
    label: "Passed Assessment — Wave Backup / Bench",
    shortLabel: "Wave Backup ⏳",
    category: "pass",
    defaultStatus: "shortlisted",
    badgeStyle: "bg-blue-950/60 text-blue-300 border-blue-500/40",
    description: "Qualified candidate on standby if primary hires drop out before induction.",
    smartPoolAction: "Can be pooled to next week's starting wave.",
  },
  {
    code: "failed_va",
    label: "Failed Voice & Accent (V&A)",
    shortLabel: "Failed V&A 🎙️",
    category: "fail",
    defaultStatus: "rejected",
    badgeStyle: "bg-amber-950/60 text-amber-300 border-amber-500/40",
    description: "Grammar or pronunciation fell short of strict UK/native tier requirements.",
    smartPoolAction: "Recommend accounts with B2 or flexible accent requirements (e.g. US Outbound, Semi-tech, Chat).",
  },
  {
    code: "failed_ops",
    label: "Failed Operations / Client Interview",
    shortLabel: "Failed Ops 🏢",
    category: "fail",
    defaultStatus: "rejected",
    badgeStyle: "bg-orange-950/60 text-orange-300 border-orange-500/40",
    description: "Good English but struggled with situational scenarios, sales questions, or confidence.",
    smartPoolAction: "Recommend inbound customer service or non-quota support accounts.",
  },
  {
    code: "failed_typing",
    label: "Failed Typing / Amcat / Tech Test",
    shortLabel: "Failed Typing/Amcat ⌨️",
    category: "fail",
    defaultStatus: "rejected",
    badgeStyle: "bg-purple-950/60 text-purple-300 border-purple-500/40",
    description: "Typing speed under 30 WPM or failed client online logic test.",
    smartPoolAction: "Recommend pure voice roles that do not require high concurrent typing.",
  },
  {
    code: "declined_salary",
    label: "Offer Declined by Candidate — Low Salary",
    shortLabel: "Declined: Salary 💵",
    category: "declined",
    defaultStatus: "rejected",
    badgeStyle: "bg-rose-950/60 text-rose-300 border-rose-500/40",
    description: "Candidate cleared assessment but package was below current compensation.",
    smartPoolAction: "Recommend high-tier sales or multilingual roles (20k–45k EGP).",
  },
  {
    code: "declined_commute",
    label: "Offer Declined by Candidate — Distance / Commute",
    shortLabel: "Declined: Commute 🚌",
    category: "declined",
    defaultStatus: "rejected",
    badgeStyle: "bg-indigo-950/60 text-indigo-300 border-indigo-500/40",
    description: "Assessment site or office too far from candidate residence.",
    smartPoolAction: "Recommend alternative partner hubs closer to candidate's home zone.",
  },
  {
    code: "no_show",
    label: "Candidate No-Show on Interview Day",
    shortLabel: "No-Show 🔴",
    category: "no_show",
    defaultStatus: "rejected",
    badgeStyle: "bg-red-950/60 text-red-300 border-red-500/40",
    description: "Did not arrive at assessment center and did not inform coordinator.",
    smartPoolAction: "Trigger Reschedule WhatsApp or re-route to next wave.",
  },
];

export function getOutcomeDefinition(code?: string | null): OutcomeCodeDefinition | null {
  if (!code) return null;
  return OUTCOME_CODES.find((o) => o.code === code) || null;
}
