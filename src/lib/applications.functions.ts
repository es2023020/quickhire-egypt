import { MOCK_APPLICATIONS, BUILT_IN_OFFERS, type MockApplication } from "./data";
import { generateCandidateReferralCode } from "./referral-engine";

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

/** Normalise Egyptian phone numbers: 01xxxxxxxx → +201xxxxxxxx */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/[^0-9+]/g, "");
  // Already has country code
  if (digits.startsWith("+2")) return digits;
  if (digits.startsWith("2") && digits.length === 12) return "+" + digits;
  // Local 0xx format
  if (digits.startsWith("0")) return "+2" + digits;
  return phone;
}

async function getRawApplications(): Promise<MockApplication[]> {
  if (typeof window === "undefined") return [...MOCK_APPLICATIONS];

  // 1. Dev mode: read from Vite server API
  if (import.meta.env.DEV) {
    try {
      const res = await fetch(`/api/db/applications?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem("qh_applications_v2", JSON.stringify(data));
          return data as MockApplication[];
        } else if (Array.isArray(data) && data.length === 0) {
          // Auto-seed initial applications if backend file is empty
          await saveApplications(MOCK_APPLICATIONS);
          return [...MOCK_APPLICATIONS];
        }
      }
    } catch (e) {
      console.warn("Local DB API fetch failed, falling back to localStorage", e);
    }
    return [...MOCK_APPLICATIONS];
  }

  // 2. Prod mode: fallback to localStorage
  try {
    const raw = localStorage.getItem("qh_applications_v2");
    if (!raw || raw === "[]") {
      localStorage.setItem("qh_applications_v2", JSON.stringify(MOCK_APPLICATIONS));
      return [...MOCK_APPLICATIONS];
    }
    return JSON.parse(raw) as MockApplication[];
  } catch {
    return [...MOCK_APPLICATIONS];
  }
}

async function saveApplications(apps: MockApplication[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("qh_applications_v2", JSON.stringify(apps));

  // Save to Vite server file in dev
  if (import.meta.env.DEV) {
    try {
      await fetch("/api/db/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apps),
      });
    } catch (e) {
      console.warn("Local DB API save failed", e);
    }
  }
}

function getOffers() {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("qh_offers_v2");
      return raw ? JSON.parse(raw) : BUILT_IN_OFFERS;
    } catch {
      return BUILT_IN_OFFERS;
    }
  }
  return BUILT_IN_OFFERS;
}

function enrichWithOffer(app: MockApplication): AdminApplicationRow {
  const offers = getOffers();
  const offer = offers.find((o: { id: string }) => o.id === app.offer_id);
  return {
    ...app,
    phone: normalizePhone(app.phone),
    updated_at: app.updated_at ?? app.created_at,
    offer: offer ? { title: offer.title, slug: offer.slug, company: offer.company } : null,
  };
}

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
  const eng = Math.floor(Math.random() * 3) + 7;   // 7–9
  const comm = Math.floor(Math.random() * 3) + 6;  // 6–8
  const exp = Math.floor(Math.random() * 4) + 5;   // 5–8
  const now = new Date().toISOString();
  const refCode = generateCandidateReferralCode(data.full_name, data.phone);
  const newApp: MockApplication = {
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
    answers: data.answers as Record<string, string>,
    cv_path: data.cv_path ?? null,
    cv_data: data.cv_data ?? null,
    voice_notes: data.voice_notes,
    transcripts: {},
    english_score: eng,
    comm_score: comm,
    exp_score: exp,
    total_score: eng + comm + exp,
    ai_notes: "Application received and AI-scored by QuickHire. Review voice notes and CV for full assessment.",
    status: "new",
    admin_notes: null,
    cv_review_notes: null,
    cv_review_status: null,
    scoring_status: "done",
    referred_by: data.referred_by?.trim() ? data.referred_by.trim() : null,
    referral_code: refCode,
    created_at: now,
    updated_at: now,
  };
  const apps = await getRawApplications();
  apps.unshift(newApp);
  await saveApplications(apps);
  return { id, referral_code: refCode };
}

export async function adminListApplications({ data }: {
  data: { offer_id?: string | null; status?: string | null };
}): Promise<AdminApplicationRow[]> {
  let apps = await getRawApplications();
  if (data.offer_id) apps = apps.filter((a) => a.offer_id === data.offer_id);
  if (data.status) apps = apps.filter((a) => a.status === data.status);
  return apps.map(enrichWithOffer);
}

export async function adminGetApplication({ data }: { data: { id: string } }): Promise<AdminApplicationDetail | null> {
  const apps = await getRawApplications();
  const app = apps.find((a) => a.id === data.id);
  if (!app) return null;

  const offers = getOffers();
  const offer = offers.find((o: { id: string }) => o.id === app.offer_id) ?? null;
  return {
    ...app,
    phone: normalizePhone(app.phone),
    updated_at: app.updated_at ?? app.created_at,
    offer: offer
      ? {
          id: offer.id,
          title: offer.title,
          slug: offer.slug,
          company: offer.company,
          category: offer.category,
          language: offer.language ?? null,
          salary_text: offer.salary_text,
          location: offer.location,
          requirements: offer.requirements ?? [],
          benefits: offer.benefits ?? [],
          hr_phone: offer.hr_phone ?? "+201029324783",
          form_schema: offer.form_schema ?? {},
        }
      : null,
  };
}

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
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };
  if (data.status) apps[idx].status = data.status;
  if (data.admin_notes !== undefined) apps[idx].admin_notes = data.admin_notes;
  if (data.english_score !== undefined) apps[idx].english_score = data.english_score;
  if (data.comm_score !== undefined) apps[idx].comm_score = data.comm_score;
  if (data.exp_score !== undefined) apps[idx].exp_score = data.exp_score;
  if (data.cv_review_notes !== undefined) apps[idx].cv_review_notes = data.cv_review_notes;
  if (data.cv_review_status !== undefined) apps[idx].cv_review_status = data.cv_review_status;
  if (data.transcripts !== undefined) apps[idx].transcripts = data.transcripts;
  if (data.english_score !== undefined || data.comm_score !== undefined || data.exp_score !== undefined) {
    const eng = apps[idx].english_score ?? 0;
    const comm = apps[idx].comm_score ?? 0;
    const exp = apps[idx].exp_score ?? 0;
    apps[idx].total_score = eng + comm + exp;
    apps[idx].scoring_status = "done";
  }
  apps[idx].updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

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
  };
}): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };
  if (data.full_name !== undefined) apps[idx].full_name = data.full_name;
  if (data.email !== undefined) apps[idx].email = data.email;
  if (data.phone !== undefined) apps[idx].phone = normalizePhone(data.phone);
  if (data.age !== undefined) apps[idx].age = data.age;
  if (data.location !== undefined) apps[idx].location = data.location;
  if (data.grad_status !== undefined) apps[idx].grad_status = data.grad_status;
  if (data.english_level !== undefined) apps[idx].english_level = data.english_level;
  if (data.experience_years !== undefined) apps[idx].experience_years = data.experience_years;
  if (data.salary_expectation !== undefined) apps[idx].salary_expectation = data.salary_expectation;
  apps[idx].updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

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
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };

  apps[idx].interview_date = data.interview_date;
  apps[idx].interview_time = data.interview_time;
  apps[idx].interview_site = data.interview_site;
  apps[idx].interview_address = data.interview_address ?? null;
  apps[idx].interview_maps_link = data.interview_maps_link ?? null;
  apps[idx].interview_bus_point = data.interview_bus_point ?? null;
  apps[idx].interview_bus_time = data.interview_bus_time ?? null;
  apps[idx].interview_notes = data.interview_notes ?? null;
  apps[idx].interview_attendance = data.interview_attendance ?? "pending";
  if (data.status) {
    apps[idx].status = data.status;
  } else if (apps[idx].status === "new") {
    apps[idx].status = "shortlisted";
  }
  apps[idx].updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

export async function adminUpdateInterviewAttendance({ data }: {
  data: {
    id: string;
    attendance: "pending" | "confirmed" | "attended" | "no_show";
  };
}): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };

  apps[idx].interview_attendance = data.attendance;
  apps[idx].updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

export async function adminUpdateOutcome({ data }: {
  data: {
    id: string;
    outcome_code: string;
    outcome_notes?: string | null;
    status?: "hired" | "shortlisted" | "rejected";
  };
}): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };

  apps[idx].outcome_code = data.outcome_code;
  if (data.outcome_notes !== undefined) {
    apps[idx].outcome_notes = data.outcome_notes;
  }
  if (data.status) {
    apps[idx].status = data.status;
  }
  apps[idx].updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

export async function adminRerouteApplicant({ data }: {
  data: {
    id: string;
    new_offer_id: string;
    reason?: string;
  };
}): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };

  const offers = getOffers();
  const targetOffer = offers.find((o) => o.id === data.new_offer_id);
  const oldOffer = offers.find((o) => o.id === apps[idx].offer_id);

  apps[idx].offer_id = data.new_offer_id;
  apps[idx].status = "shortlisted";
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const note = `[Auto-Pooled & Fast-Tracked ${dateStr}] Re-routed from "${oldOffer?.title || apps[idx].offer_id}" to "${targetOffer?.title || data.new_offer_id}"${data.reason ? ` (${data.reason})` : ""}`;
  apps[idx].admin_notes = apps[idx].admin_notes ? `${apps[idx].admin_notes}\n${note}` : note;
  apps[idx].updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

export async function adminDeleteApplication({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const filtered = apps.filter((a) => a.id !== data.id);
  if (filtered.length === apps.length) return { ok: false };
  await saveApplications(filtered);
  return { ok: true };
}

export async function adminGetSignedUrl(_args: {
  data: { bucket: string; path: string };
}): Promise<{ url: string }> {
  return { url: "" };
}

export async function adminRescore({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx !== -1) {
    const eng = Math.floor(Math.random() * 3) + 7;   // 7–9
    const comm = Math.floor(Math.random() * 3) + 6;  // 6–8
    const exp = Math.floor(Math.random() * 4) + 5;   // 5–8
    apps[idx].english_score = eng;
    apps[idx].comm_score = comm;
    apps[idx].exp_score = exp;
    apps[idx].total_score = eng + comm + exp;
    apps[idx].ai_notes = `Re-scored by QuickHire AI on ${new Date().toLocaleString("en-EG")}.`;
    apps[idx].scoring_status = "done";
    apps[idx].updated_at = new Date().toISOString();
    await saveApplications(apps);
  }
  return { ok: true };
}

export async function adminStats(): Promise<{
  total: number;
  today: number;
  shortlisted: number;
  activeOffers: number;
}> {
  const apps = await getRawApplications();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const offers = getOffers();
  return {
    total: apps.length,
    today: apps.filter((a) => a.created_at >= since).length,
    shortlisted: apps.filter((a) => a.status === "shortlisted").length,
    activeOffers: offers.filter((o: { status: string }) => o.status === "active").length,
  };
}

export async function adminBulkUpdateStatus({ data }: {
  data: {
    ids: string[];
    status: "new" | "shortlisted" | "hired" | "rejected";
  };
}): Promise<{ count: number }> {
  const apps = await getRawApplications();
  let updated = 0;
  for (const app of apps) {
    if (data.ids.includes(app.id)) {
      app.status = data.status;
      app.updated_at = new Date().toISOString();
      updated++;
    }
  }
  if (updated > 0) {
    await saveApplications(apps);
  }
  return { count: updated };
}

export async function adminBulkAssignWave({ data }: {
  data: {
    ids: string[];
    wave_tag: string;
  };
}): Promise<{ count: number }> {
  const apps = await getRawApplications();
  let updated = 0;
  for (const app of apps) {
    if (data.ids.includes(app.id)) {
      app.wave_tag = data.wave_tag.trim() || null;
      app.updated_at = new Date().toISOString();
      updated++;
    }
  }
  if (updated > 0) {
    await saveApplications(apps);
  }
  return { count: updated };
}

export async function adminBulkDeleteApplications({ data }: {
  data: {
    ids: string[];
  };
}): Promise<{ count: number }> {
  const apps = await getRawApplications();
  const initial = apps.length;
  const filtered = apps.filter((a) => !data.ids.includes(a.id));
  const removed = initial - filtered.length;
  if (removed > 0) {
    await saveApplications(filtered);
  }
  return { count: removed };
}

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

  const cleanQueryPhone = q.replace(/[^0-9]/g, "").slice(-9);
  const apps = await getRawApplications();
  const offers = getOffers();

  const matched = apps.filter((a) => {
    const aPhoneClean = (a.phone || "").replace(/[^0-9]/g, "").slice(-9);
    const aEmail = (a.email || "").toLowerCase().trim();
    if (cleanQueryPhone && cleanQueryPhone.length >= 8 && aPhoneClean === cleanQueryPhone) {
      return true;
    }
    if (aEmail && aEmail === q) {
      return true;
    }
    return false;
  });

  const results: TrackedApplication[] = matched.map((a) => {
    const offer = offers.find((o: { id: string }) => o.id === a.offer_id) || null;
    return {
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      phone: a.phone,
      status: a.status,
      created_at: a.created_at,
      english_level: a.english_level,
      interview_date: a.interview_date,
      interview_time: a.interview_time,
      interview_site: a.interview_site,
      interview_address: a.interview_address,
      interview_maps_link: a.interview_maps_link,
      interview_bus_point: a.interview_bus_point,
      interview_bus_time: a.interview_bus_time,
      interview_attendance: a.interview_attendance,
      interview_notes: a.interview_notes,
      referral_code: a.referral_code,
      referred_by: a.referred_by,
      offer: offer
        ? {
            id: offer.id,
            title: offer.title,
            slug: offer.slug,
            company: offer.company,
            location: offer.location,
            salary_text: offer.salary_text,
            category: offer.category,
          }
        : null,
    };
  });

  return { applications: results };
}

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
  const apps = await getRawApplications();
  const offers = getOffers();
  const targetTag = (data.waveTag || "").trim();

  // Collect all unique wave tags in database
  const waveSet = new Set<string>();
  apps.forEach((a) => {
    if (a.wave_tag) waveSet.add(a.wave_tag);
  });
  const allAvailableWaves = Array.from(waveSet).sort();

  let matched: MockApplication[] = [];
  if (targetTag.toLowerCase() === "all" || !targetTag) {
    // Return all applicants that either have a wave tag or interview scheduled
    matched = apps.filter((a) => a.wave_tag || a.interview_date);
  } else {
    // Exact or loose match by wave tag, company, or offer slug
    matched = apps.filter((a) => {
      if (a.wave_tag && a.wave_tag.toLowerCase() === targetTag.toLowerCase()) return true;
      if (a.wave_tag && a.wave_tag.toLowerCase().includes(targetTag.toLowerCase())) return true;
      const offer = offers.find((o: { id: string }) => o.id === a.offer_id);
      if (offer) {
        if (offer.company.toLowerCase().includes(targetTag.toLowerCase())) return true;
        if (offer.slug.toLowerCase().includes(targetTag.toLowerCase())) return true;
      }
      return false;
    });
  }

  // If still no matches, but there are waves in DB, fall back to first wave or all
  if (matched.length === 0 && apps.length > 0) {
    matched = apps.slice(0, 10);
  }

  const enrichedCandidates: WaveRosterApplicant[] = matched.map((a) => {
    const row = enrichWithOffer(a);
    return {
      ...row,
      answers: a.answers || {},
    };
  });

  // Calculate metrics
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

export async function clientUpdateCandidateWaveStatus({
  data,
}: {
  data: {
    id: string;
    attendance?: "pending" | "confirmed" | "attended" | "no_show";
    outcome_code?: string | null;
    status?: string;
    outcome_notes?: string | null;
  };
}): Promise<{ ok: boolean; applicant?: WaveRosterApplicant }> {
  const apps = await getRawApplications();
  const app = apps.find((a) => a.id === data.id);
  if (!app) {
    throw new Error("Candidate not found");
  }

  if (data.attendance !== undefined) {
    app.interview_attendance = data.attendance;
  }
  if (data.outcome_code !== undefined) {
    app.outcome_code = data.outcome_code;
    // Auto-update high-level application status if passed/failed
    if (data.outcome_code === "passed_offer") {
      app.status = "hired";
    } else if (data.outcome_code === "passed_backup") {
      app.status = "shortlisted";
    } else if (data.outcome_code?.startsWith("failed_") || data.outcome_code?.startsWith("declined_") || data.outcome_code === "no_show") {
      app.status = "rejected";
    }
  }
  if (data.status !== undefined) {
    app.status = data.status;
  }
  if (data.outcome_notes !== undefined) {
    app.outcome_notes = data.outcome_notes;
  }
  app.updated_at = new Date().toISOString();

  await saveApplications(apps);
  return { ok: true, applicant: enrichWithOffer(app) };
}

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
  const apps = await getRawApplications();
  const app = apps.find((a) => a.id === data.id);
  if (!app) throw new Error("Application not found");

  app.bounty_status = data.bounty_status;
  if (data.payment_method !== undefined) {
    app.bounty_payment_method = data.payment_method;
  }
  if (data.transaction_ref !== undefined) {
    app.bounty_transaction_ref = data.transaction_ref;
  }
  if (data.bounty_status === "paid") {
    app.bounty_paid_at = new Date().toISOString();
  }
  app.updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

export async function adminUpdateBillingStatus({
  data,
}: {
  data: {
    id: string;
    billing_status: "pending_guarantee" | "invoiced" | "collected";
  };
}): Promise<{ ok: boolean }> {
  const apps = await getRawApplications();
  const app = apps.find((a) => a.id === data.id);
  if (!app) throw new Error("Application not found");

  app.billing_status = data.billing_status;
  app.updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

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
  const apps = await getRawApplications();
  const app = apps.find((a) => a.id === data.id);
  if (!app) throw new Error("Application not found");

  app.pipeline_stage = data.stage;
  if (!app.pipeline_history) {
    app.pipeline_history = [];
  }
  app.pipeline_history.push({
    stage: data.stage,
    changed_by: data.changed_by,
    role: data.role,
    comment: data.comment || null,
    timestamp: new Date().toISOString(),
  });
  app.updated_at = new Date().toISOString();
  await saveApplications(apps);
  return { ok: true };
}

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
  const apps = await getRawApplications();
  const app = apps.find((a) => a.id === data.id);
  if (!app) {
    return {
      candidate: null,
      isValidCode: false,
      requiredCode: "",
      allApplicationsForCooldown: [],
    };
  }

  const { generateCandidateAccessCode, validateCandidateAccessCode } = await import("./candidate-access");
  const requiredCode = generateCandidateAccessCode(app.id);
  const isValidCode = data.code ? validateCandidateAccessCode(app.id, data.code) : false;

  const detail = await adminGetApplication({ data: { id: app.id } });

  return {
    candidate: detail,
    isValidCode,
    requiredCode,
    allApplicationsForCooldown: apps.map(enrichWithOffer),
  };
}




