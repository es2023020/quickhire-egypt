import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
};

function calculateAgencyPlacementFee(offerTitle: string, company: string, language?: string | null): { fee: number; tier: string } {
  const lang = (language || "").toLowerCase();
  const title = (offerTitle || "").toLowerCase();

  if (lang.includes("german") || lang.includes("deutsch") || title.includes("german") || title.includes("dutch")) {
    return { fee: 22000, tier: "German / High-Value European Tier" };
  }
  if (lang.includes("french") || lang.includes("français") || title.includes("french") || lang.includes("italian") || title.includes("italian")) {
    return { fee: 14000, tier: "French / Southern European Tier" };
  }
  if (lang.includes("arabic") || title.includes("arabic") || title.includes("عربي")) {
    return { fee: 3000, tier: "Arabic Domestic Account" };
  }
  return { fee: 5000, tier: "BPO English Account" };
}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://nwkztzuwmrceixlnkuui.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || "sb_publishable_TWz1_heoGieMx9uPYhnj3Q_lgvJ_cGH");

  // ── GET: Company Workspace Data ──
  if (req.method === "GET") {
    try {
      const companyQuery = ((req.query.company as string) || "all").trim();

      // Fetch offers
      let offersQuery = supabase.from("offers").select("*");
      if (companyQuery.toLowerCase() !== "all" && companyQuery) {
        offersQuery = offersQuery.ilike("company", `%${companyQuery}%`);
      }
      const { data: offersData } = await offersQuery.order("created_at", { ascending: false });
      const offers = offersData ?? [];

      // Fetch applications with joined offers
      let appsQuery = supabase
        .from("applications")
        .select(
          `id, full_name, email, phone, status, created_at, english_level,
          scoring_status, english_score, comm_score, exp_score, total_score, ai_notes,
          age, location, grad_status, experience_years, salary_expectation,
          cv_path, cv_data, voice_notes, transcripts,
          interview_date, interview_time, interview_site, interview_address,
          interview_maps_link, interview_bus_point, interview_bus_time,
          interview_attendance, interview_notes, wave_tag, outcome_code, outcome_notes,
          pipeline_stage, referral_code, referred_by, answers,
          billing_status, placement_fee,
          offer:offers(id, title, slug, company, location, salary_text, category, language)`
        );

      const { data: rawApps, error } = await appsQuery.order("created_at", { ascending: false });

      if (error) {
        console.error("[QuickHire Employer API] Supabase query error:", error);
      }

      let allCandidates = (rawApps ?? []).map((r: any) => ({
        ...r,
        offer: Array.isArray(r.offer) ? r.offer[0] || null : r.offer || null,
      }));

      // Filter by company if requested
      if (companyQuery.toLowerCase() !== "all" && companyQuery) {
        const filterStr = companyQuery.toLowerCase();
        allCandidates = allCandidates.filter(
          (c) => c.offer?.company && c.offer.company.toLowerCase().includes(filterStr)
        );
      }

      // Compute pipeline metrics
      const totalCandidates = allCandidates.length;
      const scheduledCount = allCandidates.filter((c) => Boolean(c.interview_date)).length;
      const hiredCount = allCandidates.filter(
        (c) => c.status === "hired" || c.outcome_code?.startsWith("passed")
      ).length;
      const backupCount = allCandidates.filter(
        (c) => c.outcome_code === "passed_backup" || c.status === "shortlisted"
      ).length;
      const pendingCount = allCandidates.filter(
        (c) => !c.outcome_code && c.status !== "rejected" && c.status !== "hired"
      ).length;

      // Extract unique wave tags
      const waveSet = new Set<string>();
      allCandidates.forEach((c) => {
        if (c.wave_tag) waveSet.add(c.wave_tag);
      });
      const waves = Array.from(waveSet).sort();

      // Compute Phase 4 Placements & Billing Roster
      const placements = allCandidates
        .filter((c) => c.status === "hired" || c.outcome_code === "passed_offer")
        .map((c) => {
          const feeInfo = calculateAgencyPlacementFee(
            c.offer?.title || "Customer Operations",
            c.offer?.company || companyQuery,
            c.offer?.language || c.english_level
          );
          return {
            candidateId: c.id,
            candidateName: c.full_name,
            candidatePhone: c.phone,
            candidateEmail: c.email,
            offerTitle: c.offer?.title || "Customer Specialist",
            company: c.offer?.company || companyQuery,
            language: c.offer?.language || "English",
            hiredDate: c.created_at,
            waveTag: c.wave_tag || "Direct Wave",
            placementFeeEgp: c.placement_fee || feeInfo.fee,
            feeTier: feeInfo.tier,
            billingStatus: c.billing_status || "pending_signoff",
            outcomeNotes: c.outcome_notes,
          };
        });

      const totalBillableEgp = placements.reduce((sum, p) => sum + p.placementFeeEgp, 0);
      const approvedCount = placements.filter((p) => p.billingStatus === "approved" || p.billingStatus === "invoiced").length;

      return res.status(200).json({
        ok: true,
        company: companyQuery,
        metrics: {
          totalCandidates,
          scheduledCount,
          hiredCount,
          backupCount,
          pendingCount,
          totalPlacementsCount: placements.length,
          totalBillableEgp,
          approvedPlacementsCount: approvedCount,
        },
        candidates: allCandidates,
        offers,
        waves,
        placements,
      });
    } catch (err: any) {
      console.error("[QuickHire Employer API] Exception:", err);
      return res.status(500).json({ error: err.message || "Failed to load employer workspace" });
    }
  }

  // ── POST: Employer Actions (Decisions & Billing Sign-off) ──
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { action, id, outcome_code, outcome_notes, status, attendance, company } = body || {};

      // Action: Phase 4 Billing Sign-Off
      if (action === "signoff_placements") {
        const candidateIds = body.candidateIds as string[];
        if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
          return res.status(400).json({ error: "Missing candidateIds to sign off" });
        }

        const { error } = await supabase
          .from("applications")
          .update({
            billing_status: "approved",
            updated_at: new Date().toISOString(),
          })
          .in("id", candidateIds);

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({
          ok: true,
          message: `Approved ${candidateIds.length} candidate placements for corporate monthly invoicing.`,
          signedOffCount: candidateIds.length,
        });
      }

      // Action: Individual Candidate Decision
      if (!id) {
        return res.status(400).json({ error: "Missing candidate id" });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (attendance !== undefined) patch.interview_attendance = attendance;
      if (outcome_code !== undefined) {
        patch.outcome_code = outcome_code;
        if (outcome_code === "passed_offer" || outcome_code === "passed_alt_account") {
          patch.status = "hired";
          patch.pipeline_stage = "accepted";
          patch.billing_status = patch.billing_status || "pending_signoff";
        } else if (outcome_code === "passed_backup") {
          patch.status = "shortlisted";
          patch.pipeline_stage = "offer_pending";
        } else if (outcome_code === "rejected_client" || outcome_code === "no_show") {
          patch.status = "rejected";
          patch.pipeline_stage = "interview_done";
        }
      }
      if (status !== undefined) patch.status = status;
      if (outcome_notes !== undefined) patch.outcome_notes = outcome_notes;

      const { data: updated, error } = await supabase
        .from("applications")
        .update(patch)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ ok: true, applicant: updated });
    } catch (err: any) {
      console.error("[QuickHire Employer API] POST Exception:", err);
      return res.status(500).json({ error: err.message || "Failed to process employer action" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
