/**
 * Client Roster Excel/CSV Exporter
 * Generates standardized client-ready roster reports with UTF-8 BOM encoding
 * for seamless opening in Microsoft Excel (Arabic + English).
 */

import type { AdminApplicationRow } from "./applications.functions";
import { checkCandidateCooldown } from "./cooldown-engine";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return '""';
  const str = String(value);
  // If value contains comma, quotes, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportClientRosterCsv(
  applications: AdminApplicationRow[],
  filenamePrefix = "QuickHire_Client_Roster"
): void {
  if (applications.length === 0) return;

  const headers = [
    "Candidate ID",
    "Candidate Full Name",
    "Phone Number",
    "Email Address",
    "Age",
    "Location / City",
    "Graduation Status",
    "Applied Role",
    "Target Company / Account",
    "Application Status",
    "Assigned Wave Tag",
    "English Level",
    "English Score (/10)",
    "Communication Score (/10)",
    "Experience Score (/10)",
    "Total Score (/30)",
    "Experience (Years)",
    "Salary Expectation (EGP)",
    "Scheduled Interview Date",
    "Interview Time Slot",
    "Assessment Site / Hub",
    "Attendance Status",
    "Shuttle Bus Hub",
    "Client Re-hire / Cooldown Alert",
    "Referred By",
    "Candidate Referral Code",
    "AI Screening Summary",
    "Submission Date",
  ];

  const rows = applications.map((app) => {
    // Check for 90-day client cooldown & historical re-application warning
    const cooldown = checkCandidateCooldown(app, applications);

    return [
      escapeCsvCell(app.id),
      escapeCsvCell(app.full_name),
      escapeCsvCell(`'${app.phone}`), // Leading quote keeps phone formatted cleanly in Excel
      escapeCsvCell(app.email),
      escapeCsvCell(app.age ?? "—"),
      escapeCsvCell(app.location ?? "—"),
      escapeCsvCell(app.grad_status ?? "—"),
      escapeCsvCell(app.offer?.title ?? "—"),
      escapeCsvCell(app.offer?.company ?? "—"),
      escapeCsvCell(app.status.toUpperCase()),
      escapeCsvCell(app.wave_tag || "General Pool"),
      escapeCsvCell(app.english_level ?? "—"),
      escapeCsvCell(app.english_score ?? "—"),
      escapeCsvCell(app.comm_score ?? "—"),
      escapeCsvCell(app.exp_score ?? "—"),
      escapeCsvCell(app.total_score ?? "—"),
      escapeCsvCell(app.experience_years ?? 0),
      escapeCsvCell(app.salary_expectation ?? "—"),
      escapeCsvCell(app.interview_date || "Not Scheduled"),
      escapeCsvCell(app.interview_time || "—"),
      escapeCsvCell(app.interview_site || "—"),
      escapeCsvCell(app.interview_attendance?.toUpperCase() || "PENDING"),
      escapeCsvCell(app.interview_bus_point || "—"),
      escapeCsvCell(cooldown.hasCooldownRisk ? `⚠️ ALERT: ${cooldown.reason}` : "Clear (No prior history)"),
      escapeCsvCell(app.referred_by || "Organic / Direct"),
      escapeCsvCell(app.referral_code || "—"),
      escapeCsvCell(app.ai_notes ? app.ai_notes.replace(/\n/g, " ") : "—"),
      escapeCsvCell(new Date(app.created_at).toLocaleDateString("en-GB")),
    ].join(",");
  });

  // Prepend \uFEFF (UTF-8 BOM) so Microsoft Excel opens Arabic text and symbols properly
  const csvContent = "\uFEFF" + [headers.map((h) => `"${h}"`).join(","), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${filenamePrefix}_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
