import { MOCK_APPLICATIONS, BUILT_IN_OFFERS, type MockApplication } from "./data";

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

function getRawApplications(): MockApplication[] {
  if (typeof window === "undefined") return [...MOCK_APPLICATIONS];
  try {
    const raw = localStorage.getItem("qh_applications");
    if (!raw) {
      localStorage.setItem("qh_applications", JSON.stringify(MOCK_APPLICATIONS));
      return [...MOCK_APPLICATIONS];
    }
    return JSON.parse(raw) as MockApplication[];
  } catch {
    return [...MOCK_APPLICATIONS];
  }
}

function saveApplications(apps: MockApplication[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("qh_applications", JSON.stringify(apps));
}

function getOffers() {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("qh_offers");
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
  };
}): Promise<{ id: string }> {
  const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const eng = Math.floor(Math.random() * 3) + 7;   // 7–9
  const comm = Math.floor(Math.random() * 3) + 6;  // 6–8
  const exp = Math.floor(Math.random() * 4) + 5;   // 5–8
  const now = new Date().toISOString();
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
    created_at: now,
    updated_at: now,
  };
  const apps = getRawApplications();
  apps.unshift(newApp);
  saveApplications(apps);
  return { id };
}

export async function adminListApplications({ data }: {
  data: { offer_id?: string | null; status?: string | null };
}): Promise<AdminApplicationRow[]> {
  let apps = getRawApplications();
  if (data.offer_id) apps = apps.filter((a) => a.offer_id === data.offer_id);
  if (data.status) apps = apps.filter((a) => a.status === data.status);
  return apps.map(enrichWithOffer);
}

export async function adminGetApplication({ data }: { data: { id: string } }): Promise<AdminApplicationDetail | null> {
  const apps = getRawApplications();
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
  const apps = getRawApplications();
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
  saveApplications(apps);
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
  const apps = getRawApplications();
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
  saveApplications(apps);
  return { ok: true };
}

export async function adminDeleteApplication({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const apps = getRawApplications();
  const filtered = apps.filter((a) => a.id !== data.id);
  if (filtered.length === apps.length) return { ok: false };
  saveApplications(filtered);
  return { ok: true };
}

export async function adminGetSignedUrl(_args: {
  data: { bucket: string; path: string };
}): Promise<{ url: string }> {
  return { url: "" };
}

export async function adminRescore({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const apps = getRawApplications();
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
    saveApplications(apps);
  }
  return { ok: true };
}

export async function adminStats(): Promise<{
  total: number;
  today: number;
  shortlisted: number;
  activeOffers: number;
}> {
  const apps = getRawApplications();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const offers = getOffers();
  return {
    total: apps.length,
    today: apps.filter((a) => a.created_at >= since).length,
    shortlisted: apps.filter((a) => a.status === "shortlisted").length,
    activeOffers: offers.filter((o: { status: string }) => o.status === "active").length,
  };
}
