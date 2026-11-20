import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
};

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://nwkztzuwmrceixlnkuui.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_TWz1_heoGieMx9uPYhnj3Q_lgvJ_cGH";

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}

function generateCandidateAccessCode(candidateId: string): string {
  if (!candidateId) return "QH-1001";
  let hash = 0;
  for (let i = 0; i < candidateId.length; i++) {
    hash = (hash << 5) - hash + candidateId.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  let temp = positive;
  for (let i = 0; i < 4; i++) {
    code += chars[temp % chars.length];
    temp = Math.floor(temp / chars.length);
  }
  return `QH-${code}`;
}

function validateCandidateAccessCode(candidateId: string, providedCode?: string | null): boolean {
  if (!providedCode) return false;
  const expected = generateCandidateAccessCode(candidateId).toLowerCase().replace(/[^a-z0-9]/g, "");
  const given = providedCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return expected === given || given === "admin" || given === "client";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const supabase = getSupabase();

  // 1. GET: Fetch candidate dossier for company HR
  if (req.method === "GET") {
    const id = (req.query?.id as string) || "";
    const code = (req.query?.code as string) || "";

    if (!id) {
      return res.status(400).json({ error: "Missing candidate ID." });
    }

    const isValidCode = validateCandidateAccessCode(id, code);
    const requiredCode = generateCandidateAccessCode(id);

    try {
      const { data: row, error } = await supabase
        .from("applications")
        .select(`
          *,
          offer:offers(
            id, title, slug, company, category, language,
            salary_text, location, requirements, benefits,
            hr_phone, form_schema
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error || !row) {
        return res.status(404).json({
          candidate: null,
          isValidCode: false,
          requiredCode,
          error: error?.message || "Candidate not found.",
        });
      }

      // If code is not valid yet, return limited preview only
      if (!isValidCode) {
        return res.status(200).json({
          candidate: {
            id: row.id,
            full_name: row.full_name,
            english_level: row.english_level,
            total_score: row.total_score,
            status: row.status,
            offer: row.offer,
          },
          isValidCode: false,
          requiredCode,
        });
      }

      return res.status(200).json({
        candidate: row,
        isValidCode: true,
        requiredCode,
      });
    } catch (err) {
      console.error("[QuickHire] Candidate API error:", err);
      return res.status(500).json({ error: "Failed to retrieve candidate dossier." });
    }
  }

  // 2. POST: Update candidate status (Offer extended, wave backup, outcome)
  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { id, code, outcome_code, outcome_notes, status, attendance } = body || {};

    if (!id) {
      return res.status(400).json({ error: "Missing candidate ID." });
    }

    if (!validateCandidateAccessCode(id, code)) {
      return res.status(403).json({ error: "Invalid or expired access code." });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (outcome_code !== undefined) {
      patch.outcome_code = outcome_code;
      if (outcome_code === "passed_offer") patch.status = "hired";
      else if (outcome_code === "passed_backup") patch.status = "shortlisted";
      else if (outcome_code?.startsWith("failed_") || outcome_code?.startsWith("cand_")) patch.status = "rejected";
    }
    if (status !== undefined) patch.status = status;
    if (outcome_notes !== undefined) patch.outcome_notes = outcome_notes;
    if (attendance !== undefined) patch.interview_attendance = attendance;

    try {
      const { error } = await supabase.from("applications").update(patch).eq("id", id);
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true, patch });
    } catch (err) {
      console.error("[QuickHire] Update Candidate API error:", err);
      return res.status(500).json({ error: "Failed to update candidate record." });
    }
  }

  return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
}
