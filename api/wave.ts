import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
};

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── GET: Fetch Wave Roster ──
  if (req.method === "GET") {
    try {
      const tag = ((req.query.tag as string) || "").trim();

      // Collect all available wave tags
      const { data: waveRows } = await supabase
        .from("applications")
        .select("wave_tag")
        .not("wave_tag", "is", null);

      const waveSet = new Set<string>();
      (waveRows ?? []).forEach((r: { wave_tag: string | null }) => {
        if (r.wave_tag) waveSet.add(r.wave_tag);
      });
      const allAvailableWaves = Array.from(waveSet).sort();

      let query = supabase
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
          offer:offers(id, title, slug, company, location, salary_text, category)`
        );

      if (tag.toLowerCase() === "all" || !tag) {
        query = query.or("wave_tag.not.is.null,interview_date.not.is.null");
      } else {
        query = query.or(`wave_tag.ilike.%${tag}%`);
      }

      const { data: rows, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("[QuickHire Wave API] Supabase query error:", error);
      }

      let matched = rows ?? [];
      if (matched.length === 0) {
        // Fallback to recent 15 applications
        const { data: fallback } = await supabase
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
            offer:offers(id, title, slug, company, location, salary_text, category)`
          )
          .order("created_at", { ascending: false })
          .limit(15);
        matched = fallback ?? [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidates = matched.map((r: any) => ({
        ...r,
        answers: r.answers || {},
        offer: Array.isArray(r.offer) ? r.offer[0] || null : r.offer || null,
      }));

      let confirmedCount = 0;
      let attendedCount = 0;
      let passedCount = 0;
      let noShowCount = 0;
      let siteName: string | null = null;
      let siteAddress: string | null = null;
      let mapsLink: string | null = null;
      let companyName: string | null = null;
      let interviewDate: string | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candidates.forEach((c: any) => {
        if (c.interview_attendance === "confirmed") confirmedCount++;
        if (c.interview_attendance === "attended") attendedCount++;
        if (c.interview_attendance === "no_show" || c.outcome_code === "no_show") noShowCount++;
        if (c.status === "hired" || c.outcome_code?.startsWith("passed")) passedCount++;

        if (!siteName && c.interview_site) siteName = c.interview_site;
        if (!siteAddress && c.interview_address) siteAddress = c.interview_address;
        if (!mapsLink && c.interview_maps_link) mapsLink = c.interview_maps_link;
        if (!companyName && c.offer?.company) companyName = c.offer.company;
        if (!interviewDate && c.interview_date) interviewDate = c.interview_date;
      });

      return res.status(200).json({
        ok: true,
        waveTag: tag || "Active Waves",
        totalCandidates: candidates.length,
        confirmedCount,
        attendedCount,
        passedCount,
        noShowCount,
        siteName,
        siteAddress,
        mapsLink,
        companyName: companyName || "Partner Client",
        interviewDate,
        candidates,
        allAvailableWaves,
      });
    } catch (err: any) {
      console.error("[QuickHire Wave API] GET Exception:", err);
      return res.status(500).json({ error: err.message || "Failed to load wave roster" });
    }
  }

  // ── POST: Update Candidate in Wave ──
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { id, attendance, outcome_code, outcome_notes, status } = body || {};

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
        .select(
          `id, full_name, email, phone, status, created_at, english_level,
          interview_date, interview_time, interview_site, interview_address,
          interview_maps_link, interview_bus_point, interview_bus_time,
          interview_attendance, interview_notes, wave_tag, outcome_code, outcome_notes,
          pipeline_stage, referral_code, referred_by,
          offer:offers(id, title, slug, company, location, salary_text, category)`
        )
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ ok: true, applicant: updated });
    } catch (err: any) {
      console.error("[QuickHire Wave API] POST Exception:", err);
      return res.status(500).json({ error: err.message || "Failed to update wave applicant" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
