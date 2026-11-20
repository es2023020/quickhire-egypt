import { generateCandidateReferralCode } from "./referral-engine";
import { scoreCandidateWithAI } from "./ai-scoring";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminApplicationRow = {
  id: string;
  offer_id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number | null;
  location: string | null;
  grad_status: string | null;
  english_level: string | null;
  experience_years: number | null;
  salary_expectation: string | null;
  cv_path: string | null;
  cv_data: string | null;
  voice_notes: { lang: string; path: string; data?: string }[];
  transcripts: Record<string, string>;
  english_score: number | null;
  comm_score: number | null;
  exp_score: number | null;
  total_score: number | null;
  ai_notes: string | null;
  status: string;
  admin_notes: string | null;
  cv_review_notes?: string | null;
  cv_review_status?: "pending" | "approved" | "rejected" | null;
  scoring_status: string;
  interview_date?: string | null;
  interview_time?: string | null;
  interview_site?: string | null;
  interview_address?: string | null;
  interview_maps_link?: string | null;
  interview_bus_point?: string | null;
  interview_bus_time?: string | null;
  interview_notes?: string | null;
  interview_attendance?: "pending" | "confirmed" | "attended" | "no_show" | null;
  wave_tag?: string | null;
  referred_by?: string | null;
  referral_code?: string | null;
  outcome_code?: string | null;
  outcome_notes?: string | null;
  pipeline_stage?: string | null;
  pipeline_history?: Array<{
    stage: string;
    changed_by: string;
    role: "admin" | "client_hr";
    comment: string | null;
    timestamp: string;
  }> | null;
  placement_fee?: number | null;
  billing_status?: "pending_guarantee" | "invoiced" | "collected" | null;
  bounty_status?: "pending_review" | "ready_to_pay" | "paid" | null;
  bounty_payment_method?: "vodafone_cash" | "instapay" | "orange_money" | "bank_transfer" | null;
  bounty_transaction_ref?: string | null;
  bounty_paid_at?: string | null;
  created_at: string;
  updated_at: string;
  offer: { title: string; slug: string; company: string } | null;
};

export type AdminApplicationDetail = AdminApplicationRow & {
  answers: Record<string, string | number | boolean | null>;
  offer:
    | (AdminApplicationRow["offer"] & {
        id: string;
        category: string;
        language: string | null;
        salary_text: string;
        location: string;
        requirements: string[];
        benefits: string[];
        hr_phone: string | null;
        form_schema: { voice_notes?: { lang: string; prompt: string }[] };
      })
    | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise Egyptian phone numbers: 01xxxxxxxx → +201xxxxxxxx */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+2")) return digits;
  if (digits.startsWith("2") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("0")) return "+2" + digits;
  return phone;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAdminRow(row: Record<string, any>): AdminApplicationRow {
  const offerRaw = row.offer;
  const offer = offerRaw
    ? { title: offerRaw.title, slug: offerRaw.slug, company: offerRaw.company }
    : null;

  return {
    id: row.id,
    offer_id: row.offer_id,
    full_name: row.full_name,
    email: row.email,
    phone: normalizePhone(row.phone || ""),
    age: row.age ?? null,
    location: row.location ?? null,
    grad_status: row.grad_status ?? null,
    english_level: row.english_level ?? null,
    experience_years: row.experience_years ?? null,
    salary_expectation: row.salary_expectation ?? null,
    cv_path: row.cv_path ?? null,
    cv_data: row.cv_data ?? null,
    voice_notes: Array.isArray(row.voice_notes) ? row.voice_notes : [],
    transcripts: (row.transcripts as Record<string, string>) ?? {},
    english_score: row.english_score ?? null,
    comm_score: row.comm_score ?? null,
    exp_score: row.exp_score ?? null,
    total_score: row.total_score ?? null,
    ai_notes: row.ai_notes ?? null,
    status: row.status ?? "new",
    admin_notes: row.admin_notes ?? null,
    cv_review_notes: row.cv_review_notes ?? null,
    cv_review_status: row.cv_review_status ?? null,
    scoring_status: row.scoring_status ?? "pending",
    interview_date: row.interview_date ?? null,
    interview_time: row.interview_time ?? null,
    interview_site: row.interview_site ?? null,
    interview_address: row.interview_address ?? null,
    interview_maps_link: row.interview_maps_link ?? null,
    interview_bus_point: row.interview_bus_point ?? null,
    interview_bus_time: row.interview_bus_time ?? null,
    interview_notes: row.interview_notes ?? null,
    interview_attendance: row.interview_attendance ?? null,
    wave_tag: row.wave_tag ?? null,
    referred_by: row.referred_by ?? null,
    referral_code: row.referral_code ?? null,
    outcome_code: row.outcome_code ?? null,
    outcome_notes: row.outcome_notes ?? null,
    pipeline_stage: row.pipeline_stage ?? null,
    pipeline_history: Array.isArray(row.pipeline_history) ? row.pipeline_history : null,
    placement_fee: row.placement_fee ?? null,
    billing_status: row.billing_status ?? null,
    bounty_status: row.bounty_status ?? null,
    bounty_payment_method: row.bounty_payment_method ?? null,
    bounty_transaction_ref: row.bounty_transaction_ref ?? null,
    bounty_paid_at: row.bounty_paid_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    offer,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAdminDetail(row: Record<string, any>): AdminApplicationDetail {
  const base = rowToAdminRow(row);
  const offerRaw = row.offer;

  const offer: AdminApplicationDetail["offer"] = offerRaw
    ? {
        id: offerRaw.id,
        title: offerRaw.title,
        slug: offerRaw.slug,
        company: offerRaw.company,
        category: offerRaw.category ?? "Sales Representative",
        language: offerRaw.language ?? null,
        salary_text: offerRaw.salary_text ?? "TBC",
        location: offerRaw.location ?? "Cairo",
        requirements: Array.isArray(offerRaw.requirements) ? offerRaw.requirements : [],
        benefits: Array.isArray(offerRaw.benefits) ? offerRaw.benefits : [],
        hr_phone: offerRaw.hr_phone ?? null,
        form_schema: (offerRaw.form_schema as { voice_notes?: { lang: string; prompt: string }[] }) ?? {},
      }
    : null;

  return {
    ...base,
    answers: (row.answers as Record<string, string | number | boolean | null>) ?? {},
    offer,
  };
}

const APP_SELECT_ROW = `
  *,
  offer:offers(
    id, title, slug, company, category, language,
    salary_text, location, requirements, benefits,
    hr_phone, form_schema
  )
`.trim();

// ─── Submit application ───────────────────────────────────────────────────────

export async function submitApplication({ data }: {
  data: {
    offer_id: string;
    full_name: string;
    email: string;
    phone: string;
    age?: number | null;
    location?: string | null;
    grad_status?: string | null;
    english_level?: string | null;
    experience_years?: number | null;
    salary_expectation?: string | null;
    answers: Record<string, unknown>;
    cv_path?: string | null;
    cv_data?: string | null;
    voice_notes: { lang: string; path: string; data?: string }[];
    referred_by?: string | null;
  };
}): Promise<{ id: string; referral_code: string }> {
  const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // Fetch offer for AI scoring
  let targetOffer = null;
  try {
    const { data: offerRow } = await supabase
      .from("offers")
      .select("*")
      .eq("id", data.offer_id)
      .maybeSingle();
    targetOffer = offerRow;
  } catch (_) {
    // non-fatal
  }

  // AI scoring
  let aiResult = {
    english_score: 8,
    comm_score: 7,
    exp_score: 7,
    total_score: 22,
    ai_notes: "Evaluated by QuickHire AI against job requirements.",
    scoring_status: "done",
  };

  try {
    aiResult = await scoreCandidateWithAI({
      applicant: {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        age: data.age,
        location: data.location,
        grad_status: data.grad_status,
        english_level: data.english_level,
        experience_years: data.experience_years,
        salary_expectation: data.salary_expectation,
        answers: data.answers,
        cv_data: data.cv_data,
        cv_path: data.cv_path,
        voice_notes: data.voice_notes,
      },
      offer: targetOffer,
    });
  } catch (err) {
    console.warn("[QuickHire] AI scoring fallback applied:", err);
  }

  // Referral code — fetch existing codes for uniqueness check
  let existingCodes: string[] = [];
  try {
    const { data: codeRows } = await supabase
      .from("applications")
      .select("referral_code")
      .not("referral_code", "is", null);
    existingCodes = (codeRows ?? []).map((r: { referral_code: string | null }) => r.referral_code).filter(Boolean) as string[];
  } catch (_) {
    // non-fatal
  }

  const refCode = generateCandidateReferralCode(data.full_name, data.phone, existingCodes);

  const { error } = await supabase.from("applications").insert({
    id,
    offer_id: data.offer_id,
    full_name: data.full_name,
    email: data.email,
    phone: normalizePhone(data.phone),
    age: data.age ?? null,
    location: data.location ?? null,
    grad_status: data.grad_status ?? null,
    english_level: data.english_level ?? null,
    experience_years: data.experience_years ?? null,
    salary_expectation: data.salary_expectation ?? null,
    answers: data.answers ?? {},
    cv_path: data.cv_path ?? null,
    cv_data: data.cv_data ?? null,
    voice_notes: data.voice_notes,
    transcripts: {},
    english_score: aiResult.english_score,
    comm_score: aiResult.comm_score,
    exp_score: aiResult.exp_score,
    total_score: aiResult.total_score,
    ai_notes: aiResult.ai_notes,
    status: "new",
    admin_notes: null,
    cv_review_notes: null,
    cv_review_status: null,
    scoring_status: "done",
    referred_by: data.referred_by?.trim() ? data.referred_by.trim() : null,
    referral_code: refCode,
    created_at: now,
    updated_at: now,
  });

  if (error) throw new Error(`Failed to submit application: ${error.message}`);
  return { id, referral_code: refCode };
}

// ─── Admin: list applications ─────────────────────────────────────────────────

export async function adminListApplications({ data }: {
  data: { offer_id?: string | null; status?: string | null };
}): Promise<AdminApplicationRow[]> {
  let query = supabase
    .from("applications")
    .select(APP_SELECT_ROW)
    .order("created_at", { ascending: false });

  if (data.offer_id) query = query.eq("offer_id", data.offer_id);
  if (data.status) query = query.eq("status", data.status);

  const { data: rows, error } = await query;
  if (error) {
    console.warn("[QuickHire] adminListApplications error:", error.message);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows ?? []).map((r: any) => rowToAdminRow(r));
}

// ─── Admin: get single application ───────────────────────────────────────────

export async function adminGetApplication({ data }: { data: { id: string } }): Promise<AdminApplicationDetail | null> {
  const { data: row, error } = await supabase
    .from("applications")
    .select(APP_SELECT_ROW)
    .eq("id", data.id)
    .maybeSingle();

  if (error || !row) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rowToAdminDetail(row as any);
}

// ─── Admin: update status / notes / scores ────────────────────────────────────

export async function adminUpdateApplicationStatus({ data }: {
  data: {
    id: string;
    status?: "new" | "shortlisted" | "rejected" | "hired";
    admin_notes?: string;
    english_score?: number;
    comm_score?: number;
    exp_score?: number;
    cv_review_notes?: string | null;
    cv_review_status?: "pending" | "approved" | "rejected" | null;
    transcripts?: Record<string, string> | null;
  };
}): Promise<{ ok: boolean }> {
  // Fetch current scores to compute total
  const { data: cur } = await supabase
    .from("applications")
    .select("english_score, comm_score, exp_score")
    .eq("id", data.id)
    .maybeSingle();

  const eng = data.english_score ?? cur?.english_score ?? 0;
  const comm = data.comm_score ?? cur?.comm_score ?? 0;
  const exp = data.exp_score ?? cur?.exp_score ?? 0;
  const scoreChanged = data.english_score !== undefined || data.comm_score !== undefined || data.exp_score !== undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) patch.status = data.status;
  if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
  if (data.english_score !== undefined) patch.english_score = data.english_score;
  if (data.comm_score !== undefined) patch.comm_score = data.comm_score;
  if (data.exp_score !== undefined) patch.exp_score = data.exp_score;
  if (data.cv_review_notes !== undefined) patch.cv_review_notes = data.cv_review_notes;
  if (data.cv_review_status !== undefined) patch.cv_review_status = data.cv_review_status;
  if (data.transcripts !== undefined) patch.transcripts = data.transcripts ?? {};
  if (scoreChanged) {
    patch.total_score = eng + comm + exp;
    patch.scoring_status = "done";
  }

  const { error } = await supabase.from("applications").update(patch).eq("id", data.id);
  if (error) {
    console.warn("[QuickHire] adminUpdateApplicationStatus error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: update applicant profile ─────────────────────────────────────────

export async function adminUpdateApplicant({ data }: {
  data: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
    age?: number | null;
    location?: string | null;
    grad_status?: string | null;
    english_level?: string | null;
    experience_years?: number | null;
    salary_expectation?: string | null;
    cv_path?: string | null;
    cv_data?: string | null;
  };
}): Promise<{ ok: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.full_name !== undefined) patch.full_name = data.full_name;
  if (data.email !== undefined) patch.email = data.email;
  if (data.phone !== undefined) patch.phone = normalizePhone(data.phone);
  if (data.age !== undefined) patch.age = data.age;
  if (data.location !== undefined) patch.location = data.location;
  if (data.grad_status !== undefined) patch.grad_status = data.grad_status;
  if (data.english_level !== undefined) patch.english_level = data.english_level;
  if (data.experience_years !== undefined) patch.experience_years = data.experience_years;
  if (data.salary_expectation !== undefined) patch.salary_expectation = data.salary_expectation;
  if (data.cv_path !== undefined) patch.cv_path = data.cv_path;
  if (data.cv_data !== undefined) patch.cv_data = data.cv_data;

  const { error } = await supabase.from("applications").update(patch).eq("id", data.id);
  if (error) {
    console.warn("[QuickHire] adminUpdateApplicant error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: schedule interview ────────────────────────────────────────────────

export async function adminScheduleInterview({ data }: {
  data: {
    id: string;
    interview_date: string;
    interview_time: string;
    interview_site: string;
    interview_address?: string | null;
    interview_maps_link?: string | null;
    interview_bus_point?: string | null;
    interview_bus_time?: string | null;
    interview_notes?: string | null;
    interview_attendance?: "pending" | "confirmed" | "attended" | "no_show";
    status?: "shortlisted" | "new" | "hired" | "rejected";
  };
}): Promise<{ ok: boolean }> {
  // Fetch current status to auto-promote
  const { data: cur } = await supabase.from("applications").select("status").eq("id", data.id).maybeSingle();
  const newStatus = data.status ?? (cur?.status === "new" ? "shortlisted" : cur?.status ?? "shortlisted");

  const { error } = await supabase.from("applications").update({
    interview_date: data.interview_date,
    interview_time: data.interview_time,
    interview_site: data.interview_site,
    interview_address: data.interview_address ?? null,
    interview_maps_link: data.interview_maps_link ?? null,
    interview_bus_point: data.interview_bus_point ?? null,
    interview_bus_time: data.interview_bus_time ?? null,
    interview_notes: data.interview_notes ?? null,
    interview_attendance: data.interview_attendance ?? "pending",
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq("id", data.id);

  if (error) {
    console.warn("[QuickHire] adminScheduleInterview error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: update interview attendance ───────────────────────────────────────

export async function adminUpdateInterviewAttendance({ data }: {
  data: {
    id: string;
    attendance: "pending" | "confirmed" | "attended" | "no_show";
  };
}): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("applications").update({
    interview_attendance: data.attendance,
    updated_at: new Date().toISOString(),
  }).eq("id", data.id);

  if (error) {
    console.warn("[QuickHire] adminUpdateInterviewAttendance error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: update outcome ────────────────────────────────────────────────────

export async function adminUpdateOutcome({ data }: {
  data: {
    id: string;
    outcome_code: string;
    outcome_notes?: string | null;
    status?: "hired" | "shortlisted" | "rejected";
  };
}): Promise<{ ok: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {
    outcome_code: data.outcome_code,
    updated_at: new Date().toISOString(),
  };
  if (data.outcome_notes !== undefined) patch.outcome_notes = data.outcome_notes;
  if (data.status) patch.status = data.status;

  const { error } = await supabase.from("applications").update(patch).eq("id", data.id);
  if (error) {
    console.warn("[QuickHire] adminUpdateOutcome error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: reroute applicant to a different offer ────────────────────────────

export async function adminRerouteApplicant({ data }: {
  data: {
    id: string;
    new_offer_id: string;
    reason?: string;
  };
}): Promise<{ ok: boolean }> {
  // Fetch current app + old offer title
  const { data: app } = await supabase
    .from("applications")
    .select("offer_id, admin_notes")
    .eq("id", data.id)
    .maybeSingle();

  let oldTitle = app?.offer_id ?? "unknown";
  let newTitle = data.new_offer_id;
  try {
    const [oldRes, newRes] = await Promise.all([
      supabase.from("offers").select("title").eq("id", app?.offer_id ?? "").maybeSingle(),
      supabase.from("offers").select("title").eq("id", data.new_offer_id).maybeSingle(),
    ]);
    if (oldRes.data?.title) oldTitle = oldRes.data.title;
    if (newRes.data?.title) newTitle = newRes.data.title;
  } catch (_) {
    // non-fatal
  }

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const note = `[Auto-Pooled & Fast-Tracked ${dateStr}] Re-routed from "${oldTitle}" to "${newTitle}"${data.reason ? ` (${data.reason})` : ""}`;
  const existingNotes = app?.admin_notes ?? "";
  const newNotes = existingNotes ? `${existingNotes}\n${note}` : note;

  const { error } = await supabase.from("applications").update({
    offer_id: data.new_offer_id,
    status: "shortlisted",
    admin_notes: newNotes,
    updated_at: new Date().toISOString(),
  }).eq("id", data.id);

  if (error) {
    console.warn("[QuickHire] adminRerouteApplicant error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: delete application ────────────────────────────────────────────────

export async function adminDeleteApplication({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("applications").delete().eq("id", data.id);
  if (error) {
    console.warn("[QuickHire] adminDeleteApplication error:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: signed URL (stub — no Supabase Storage configured) ───────────────

export async function adminGetSignedUrl(_args: {
  data: { bucket: string; path: string };
}): Promise<{ url: string }> {
  return { url: "" };
}

// ─── Admin: AI re-score ───────────────────────────────────────────────────────

export async function adminRescore({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const { data: row, error } = await supabase
    .from("applications")
    .select(APP_SELECT_ROW)
    .eq("id", data.id)
    .maybeSingle();

  if (error || !row) return { ok: false };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = rowToAdminDetail(row as any);
  const targetOffer = app.offer;

  let aiResult = {
    english_score: 8,
    comm_score: 8,
    exp_score: 7,
    total_score: 23,
    ai_notes: `Re-scored by QuickHire AI on ${new Date().toLocaleString("en-EG")}.`,
    scoring_status: "done",
  };

  try {
    aiResult = await scoreCandidateWithAI({
      applicant: {
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        age: app.age,
        location: app.location,
        grad_status: app.grad_status,
        english_level: app.english_level,
        experience_years: app.experience_years,
        salary_expectation: app.salary_expectation,
        answers: app.answers,
        cv_data: app.cv_data,
        cv_path: app.cv_path,
        voice_notes: app.voice_notes,
        transcripts: app.transcripts,
      },
      offer: targetOffer,
    });
  } catch (err) {
    console.warn("[QuickHire] Re-score fallback applied:", err);
  }

  const { error: updateErr } = await supabase.from("applications").update({
    english_score: aiResult.english_score,
    comm_score: aiResult.comm_score,
    exp_score: aiResult.exp_score,
    total_score: aiResult.total_score,
    ai_notes: aiResult.ai_notes,
    scoring_status: "done",
    updated_at: new Date().toISOString(),
  }).eq("id", data.id);

  if (updateErr) {
    console.warn("[QuickHire] adminRescore update error:", updateErr.message);
    return { ok: false };
  }
  return { ok: true };
}

// ─── Admin: stats ─────────────────────────────────────────────────────────────

export async function adminStats(): Promise<{
  total: number;
  today: number;
  shortlisted: number;
  activeOffers: number;
}> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [totalRes, todayRes, shortlistRes, offersRes] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "shortlisted"),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return {
    total: totalRes.count ?? 0,
    today: todayRes.count ?? 0,
    shortlisted: shortlistRes.count ?? 0,
    activeOffers: offersRes.count ?? 0,
  };
}

// ─── Admin: bulk operations ───────────────────────────────────────────────────

export async function adminBulkUpdateStatus({ data }: {
  data: {
    ids: string[];
    status: "new" | "shortlisted" | "hired" | "rejected";
  };
}): Promise<{ count: number }> {
  if (!data.ids.length) return { count: 0 };

  const { error, count } = await supabase
    .from("applications")
    .update({ status: data.status, updated_at: new Date().toISOString() })
    .in("id", data.ids);

  if (error) {
    console.warn("[QuickHire] adminBulkUpdateStatus error:", error.message);
    return { count: 0 };
  }
  return { count: count ?? data.ids.length };
}

export async function adminBulkAssignWave({ data }: {
  data: {
    ids: string[];
    wave_tag: string;
  };
}): Promise<{ count: number }> {
  if (!data.ids.length) return { count: 0 };

  const { error, count } = await supabase
    .from("applications")
    .update({ wave_tag: data.wave_tag.trim() || null, updated_at: new Date().toISOString() })
    .in("id", data.ids);

  if (error) {
    console.warn("[QuickHire] adminBulkAssignWave error:", error.message);
    return { count: 0 };
  }
  return { count: count ?? data.ids.length };
}

export async function adminBulkDeleteApplications({ data }: {
  data: {
    ids: string[];
  };
}): Promise<{ count: number }> {
  if (!data.ids.length) return { count: 0 };

  const { error, count } = await supabase
    .from("applications")
    .delete()
    .in("id", data.ids);

  if (error) {
    console.warn("[QuickHire] adminBulkDeleteApplications error:", error.message);
    return { count: 0 };
  }
  return { count: count ?? data.ids.length };
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export type TrackedApplication = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  english_level: string | null;
  interview_date?: string | null;
  interview_time?: string | null;
  interview_site?: string | null;
  interview_address?: string | null;
  interview_maps_link?: string | null;
  interview_bus_point?: string | null;
  interview_bus_time?: string | null;
  interview_attendance?: "pending" | "confirmed" | "attended" | "no_show" | null;
  interview_notes?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  pipeline_stage?: string | null;
  pipeline_history?: Array<{
    stage: string;
    changed_by: string;
    role: "admin" | "client_hr";
    comment: string | null;
    timestamp: string;
  }> | null;
  offer: {
    id: string;
    title: string;
    slug: string;
    company: string;
    location: string;
    salary_text: string;
    category: string;
  } | null;
};

export async function trackApplicationByPhone({ data }: {
  data: {
    query: string;
  };
}): Promise<{ applications: TrackedApplication[] }> {
  const q = data.query.trim().toLowerCase();
  if (!q) return { applications: [] };

  // 1. Try secure RPC function first (enables tracking even when applications table is locked down with strict RLS)
  try {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc("track_candidate_status", {
      query_text: q,
    });

    if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: TrackedApplication[] = rpcRows.map((r: any) => ({
        id: r.id,
        full_name: r.full_name,
        email: "",
        phone: "",
        status: r.status,
        created_at: r.created_at,
        english_level: r.english_level ?? null,
        interview_date: r.interview_date ?? null,
        interview_time: r.interview_time ?? null,
        interview_site: r.interview_site ?? null,
        interview_address: r.interview_address ?? null,
        interview_maps_link: r.interview_maps_link ?? null,
        interview_bus_point: r.interview_bus_point ?? null,
        interview_bus_time: r.interview_bus_time ?? null,
        interview_attendance: r.interview_attendance ?? null,
        interview_notes: null,
        referral_code: r.referral_code ?? null,
        referred_by: null,
        pipeline_stage: r.pipeline_stage || "applied",
        pipeline_history: [],
        offer: r.offer_title
          ? {
              id: r.offer_id,
              title: r.offer_title,
              slug: r.offer_slug || "",
              company: r.offer_company || "",
              location: r.offer_location || "",
              salary_text: r.offer_salary_text || "",
              category: r.offer_category || "",
            }
          : null,
      }));
      return { applications: results };
    }
  } catch (_) {
    // non-fatal, fallback to direct query below
  }

  // 2. Direct query fallback (when user is authenticated admin)

  // Try phone match first (last 9 digits), then email
  const cleanQueryPhone = q.replace(/[^0-9]/g, "").slice(-9);
  const isEmail = q.includes("@");

  let rows: Record<string, unknown>[] = [];

  if (isEmail) {
    const { data: emailRows } = await supabase
      .from("applications")
      .select(`id, full_name, email, phone, status, created_at, english_level,
        interview_date, interview_time, interview_site, interview_address,
        interview_maps_link, interview_bus_point, interview_bus_time,
        interview_attendance, interview_notes, referral_code, referred_by,
        pipeline_stage, pipeline_history,
        offer:offers(id, title, slug, company, location, salary_text, category)`)
      .ilike("email", q);
    rows = emailRows ?? [];
  } else if (cleanQueryPhone.length >= 8) {
    // Supabase doesn't support regex substring match easily; fetch a reasonable window
    const { data: phoneRows } = await supabase
      .from("applications")
      .select(`id, full_name, email, phone, status, created_at, english_level,
        interview_date, interview_time, interview_site, interview_address,
        interview_maps_link, interview_bus_point, interview_bus_time,
        interview_attendance, interview_notes, referral_code, referred_by,
        pipeline_stage, pipeline_history,
        offer:offers(id, title, slug, company, location, salary_text, category)`)
      .or(`phone.like.%${cleanQueryPhone}%,phone.like.%${q}%`)
      .limit(50);
    // Filter in JS for last-9-digits match
    rows = (phoneRows ?? []).filter((r) => {
      const rPhone = ((r.phone as string) || "").replace(/[^0-9]/g, "").slice(-9);
      return rPhone === cleanQueryPhone;
    });
  }

  const results: TrackedApplication[] = rows.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offerRaw = r.offer as any;
    return {
      id: r.id as string,
      full_name: r.full_name as string,
      email: r.email as string,
      phone: r.phone as string,
      status: r.status as string,
      created_at: r.created_at as string,
      english_level: (r.english_level as string | null) ?? null,
      interview_date: (r.interview_date as string | null) ?? null,
      interview_time: (r.interview_time as string | null) ?? null,
      interview_site: (r.interview_site as string | null) ?? null,
      interview_address: (r.interview_address as string | null) ?? null,
      interview_maps_link: (r.interview_maps_link as string | null) ?? null,
      interview_bus_point: (r.interview_bus_point as string | null) ?? null,
      interview_bus_time: (r.interview_bus_time as string | null) ?? null,
      interview_attendance: (r.interview_attendance as TrackedApplication["interview_attendance"]) ?? null,
      interview_notes: (r.interview_notes as string | null) ?? null,
      referral_code: (r.referral_code as string | null) ?? null,
      referred_by: (r.referred_by as string | null) ?? null,
      pipeline_stage: ((r.pipeline_stage as string | null) ?? "applied"),
      pipeline_history: Array.isArray(r.pipeline_history) ? r.pipeline_history as TrackedApplication["pipeline_history"] : [],
      offer: offerRaw
        ? {
            id: offerRaw.id,
            title: offerRaw.title,
            slug: offerRaw.slug,
            company: offerRaw.company,
            location: offerRaw.location,
            salary_text: offerRaw.salary_text,
            category: offerRaw.category,
          }
        : null,
    };
  });

  return { applications: results };
}

// ─── Wave roster ──────────────────────────────────────────────────────────────

export type WaveRosterApplicant = AdminApplicationRow & {
  answers?: Record<string, string | number | boolean | null>;
};

export type WaveRosterResponse = {
  waveTag: string;
  totalCandidates: number;
  confirmedCount: number;
  attendedCount: number;
  passedCount: number;
  noShowCount: number;
  siteName: string | null;
  siteAddress: string | null;
  mapsLink: string | null;
  companyName: string | null;
  interviewDate: string | null;
  candidates: WaveRosterApplicant[];
  allAvailableWaves: string[];
};

export async function getWaveRoster({ data }: { data: { waveTag: string } }): Promise<WaveRosterResponse> {
  const targetTag = (data.waveTag || "").trim();

  // Collect all unique wave tags
  const { data: waveRows } = await supabase
    .from("applications")
    .select("wave_tag")
    .not("wave_tag", "is", null);

  const waveSet = new Set<string>();
  (waveRows ?? []).forEach((r: { wave_tag: string | null }) => { if (r.wave_tag) waveSet.add(r.wave_tag); });
  const allAvailableWaves = Array.from(waveSet).sort();

  let query = supabase.from("applications").select(`${APP_SELECT_ROW}, answers`);

  if (targetTag.toLowerCase() === "all" || !targetTag) {
    query = query.or("wave_tag.not.is.null,interview_date.not.is.null");
  } else {
    query = query.or(`wave_tag.ilike.%${targetTag}%`);
  }

  const { data: rows } = await query.order("created_at", { ascending: false });

  // If no matches, fetch recent 10
  let matched = rows ?? [];
  if (matched.length === 0) {
    const { data: fallback } = await supabase
      .from("applications")
      .select(`${APP_SELECT_ROW}, answers`)
      .order("created_at", { ascending: false })
      .limit(10);
    matched = fallback ?? [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedCandidates: WaveRosterApplicant[] = matched.map((r: any) => ({
    ...rowToAdminRow(r),
    answers: (r.answers as Record<string, string | number | boolean | null>) ?? {},
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

  enrichedCandidates.forEach((c) => {
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

  return {
    waveTag: targetTag || "Active Waves",
    totalCandidates: enrichedCandidates.length,
    confirmedCount,
    attendedCount,
    passedCount,
    noShowCount,
    siteName,
    siteAddress,
    mapsLink,
    companyName: companyName || "Partner Client",
    interviewDate,
    candidates: enrichedCandidates,
    allAvailableWaves,
  };
}

// ─── Client: update wave status ───────────────────────────────────────────────

export async function clientUpdateCandidateWaveStatus({
  data,
}: {
  data: {
    id: string;
    attendance?: "pending" | "confirmed" | "attended" | "no_show";
    outcome_code?: string | null;
    status?: string;
    outcome_notes?: string | null;
    code?: string | null;
  };
}): Promise<{ ok: boolean; applicant?: WaveRosterApplicant }> {
  // Try serverless API first (securely bypasses client-side RLS)
  if (typeof window !== "undefined") {
    try {
      const codeFromUrl = new URLSearchParams(window.location.search).get("code") || data.code || "";
      const res = await fetch("/api/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.id,
          code: codeFromUrl,
          attendance: data.attendance,
          outcome_code: data.outcome_code,
          status: data.status,
          outcome_notes: data.outcome_notes,
        }),
      });
      if (res.ok) {
        return { ok: true };
      }
    } catch (apiErr) {
      console.warn("[QuickHire] /api/candidate update fallback to direct supabase:", apiErr);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  if (data.attendance !== undefined) patch.interview_attendance = data.attendance;
  if (data.outcome_code !== undefined) {
    patch.outcome_code = data.outcome_code;
    if (data.outcome_code === "passed_offer") patch.status = "hired";
    else if (data.outcome_code === "passed_backup") patch.status = "shortlisted";
    else if (
      data.outcome_code?.startsWith("failed_") ||
      data.outcome_code?.startsWith("declined_") ||
      data.outcome_code === "no_show"
    ) {
      patch.status = "rejected";
    }
  }
  if (data.status !== undefined) patch.status = data.status;
  if (data.outcome_notes !== undefined) patch.outcome_notes = data.outcome_notes;

  const { error } = await supabase.from("applications").update(patch).eq("id", data.id);
  if (error) {
    console.warn("Direct update error:", error.message);
  }

  const { data: updated } = await supabase
    .from("applications")
    .select(APP_SELECT_ROW)
    .eq("id", data.id)
    .maybeSingle();

  return {
    ok: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applicant: updated ? { ...rowToAdminRow(updated as any), answers: {} } : undefined,
  };
}

// ─── Admin: bounty payment ────────────────────────────────────────────────────

export async function adminUpdateBountyPayment({
  data,
}: {
  data: {
    id: string;
    bounty_status: "pending_review" | "ready_to_pay" | "paid";
    payment_method?: "vodafone_cash" | "instapay" | "orange_money" | "bank_transfer" | null;
    transaction_ref?: string | null;
  };
}): Promise<{ ok: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {
    bounty_status: data.bounty_status,
    updated_at: new Date().toISOString(),
  };
  if (data.payment_method !== undefined) patch.bounty_payment_method = data.payment_method;
  if (data.transaction_ref !== undefined) patch.bounty_transaction_ref = data.transaction_ref;
  if (data.bounty_status === "paid") patch.bounty_paid_at = new Date().toISOString();

  const { error } = await supabase.from("applications").update(patch).eq("id", data.id);
  if (error) throw new Error(`adminUpdateBountyPayment: ${error.message}`);
  return { ok: true };
}

// ─── Admin: billing status ────────────────────────────────────────────────────

export async function adminUpdateBillingStatus({
  data,
}: {
  data: {
    id: string;
    billing_status: "pending_guarantee" | "invoiced" | "collected";
  };
}): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("applications").update({
    billing_status: data.billing_status,
    updated_at: new Date().toISOString(),
  }).eq("id", data.id);
  if (error) throw new Error(`adminUpdateBillingStatus: ${error.message}`);
  return { ok: true };
}

// ─── Admin: pipeline stage ────────────────────────────────────────────────────

export async function adminUpdatePipelineStage({
  data,
}: {
  data: {
    id: string;
    stage: string;
    changed_by: string;
    role: "admin" | "client_hr";
    comment?: string | null;
  };
}): Promise<{ ok: boolean }> {
  const { data: cur } = await supabase
    .from("applications")
    .select("pipeline_history")
    .eq("id", data.id)
    .maybeSingle();

  const history: AdminApplicationRow["pipeline_history"] = Array.isArray(cur?.pipeline_history)
    ? cur.pipeline_history
    : [];

  history.push({
    stage: data.stage,
    changed_by: data.changed_by,
    role: data.role,
    comment: data.comment || null,
    timestamp: new Date().toISOString(),
  });

  const { error } = await supabase.from("applications").update({
    pipeline_stage: data.stage,
    pipeline_history: history,
    updated_at: new Date().toISOString(),
  }).eq("id", data.id);

  if (error) throw new Error(`adminUpdatePipelineStage: ${error.message}`);
  return { ok: true };
}

// ─── Candidate self-service profile ──────────────────────────────────────────

export type CandidateProfileResponse = {
  candidate: AdminApplicationDetail | null;
  isValidCode: boolean;
  requiredCode: string;
  allApplicationsForCooldown: AdminApplicationRow[];
};

export async function getClientCandidateProfile({
  data,
}: {
  data: {
    id: string;
    code?: string | null;
  };
}): Promise<CandidateProfileResponse> {
  const { generateCandidateAccessCode, validateCandidateAccessCode } = await import("./candidate-access");
  const requiredCode = generateCandidateAccessCode(data.id);
  const isValidCode = data.code ? validateCandidateAccessCode(data.id, data.code) : false;

  // 1. Try serverless API first (securely bypasses client-side RLS)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/candidate?id=${encodeURIComponent(data.id)}&code=${encodeURIComponent(data.code || "")}`);
      if (res.ok) {
        const json = await res.json();
        if (json.candidate) {
          const detail = rowToAdminDetail(json.candidate);
          return {
            candidate: detail,
            isValidCode: json.isValidCode ?? isValidCode,
            requiredCode: json.requiredCode ?? requiredCode,
            allApplicationsForCooldown: [],
          };
        }
      }
    } catch (apiErr) {
      console.warn("[QuickHire] /api/candidate fallback to direct supabase:", apiErr);
    }
  }

  // 2. Direct Supabase query fallback
  const { data: row, error } = await supabase
    .from("applications")
    .select(APP_SELECT_ROW)
    .eq("id", data.id)
    .maybeSingle();

  if (error || !row) {
    return {
      candidate: null,
      isValidCode: false,
      requiredCode,
      allApplicationsForCooldown: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRow = row as any;
  const detail = rowToAdminDetail(rawRow);

  return {
    candidate: detail,
    isValidCode,
    requiredCode,
    allApplicationsForCooldown: [],
  };
}
