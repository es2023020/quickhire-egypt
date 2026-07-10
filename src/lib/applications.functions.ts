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
  voice_notes: { lang: string; path: string }[];
  transcripts: Record<string, string>;
  english_score: number | null;
  comm_score: number | null;
  exp_score: number | null;
  total_score: number | null;
  ai_notes: string | null;
  status: string;
  admin_notes: string | null;
  scoring_status: string;
  created_at: string;
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

function enrichWithOffer(app: MockApplication): AdminApplicationRow {
  const offers = typeof window !== "undefined"
    ? (() => {
        try {
          const raw = localStorage.getItem("qh_offers");
          return raw ? JSON.parse(raw) : BUILT_IN_OFFERS;
        } catch {
          return BUILT_IN_OFFERS;
        }
      })()
    : BUILT_IN_OFFERS;

  const offer = offers.find((o: { id: string }) => o.id === app.offer_id);
  return {
    ...app,
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
    voice_notes: { lang: string; path: string }[];
  };
}): Promise<{ id: string }> {
  const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const eng = Math.floor(Math.random() * 4) + 6;
  const comm = Math.floor(Math.random() * 4) + 6;
  const exp = Math.floor(Math.random() * 4) + 5;
  const newApp: MockApplication = {
    id,
    offer_id: data.offer_id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    age: data.age ?? null,
    location: data.location ?? null,
    grad_status: data.grad_status ?? null,
    english_level: data.english_level ?? null,
    experience_years: data.experience_years ?? null,
    salary_expectation: data.salary_expectation ?? null,
    answers: data.answers as Record<string, string>,
    cv_path: data.cv_path ?? null,
    voice_notes: data.voice_notes,
    transcripts: {},
    english_score: eng,
    comm_score: comm,
    exp_score: exp,
    total_score: eng + comm + exp,
    ai_notes: "Application received and AI-scored by QuickHire. Review voice notes for full assessment.",
    status: "new",
    admin_notes: null,
    scoring_status: "done",
    created_at: new Date().toISOString(),
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

  const offers = typeof window !== "undefined"
    ? (() => {
        try {
          const raw = localStorage.getItem("qh_offers");
          return raw ? JSON.parse(raw) : BUILT_IN_OFFERS;
        } catch {
          return BUILT_IN_OFFERS;
        }
      })()
    : BUILT_IN_OFFERS;

  const offer = offers.find((o: { id: string }) => o.id === app.offer_id) ?? null;
  return {
    ...app,
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
  data: { id: string; status?: "new" | "shortlisted" | "rejected" | "hired"; admin_notes?: string };
}): Promise<{ ok: boolean }> {
  const apps = getRawApplications();
  const idx = apps.findIndex((a) => a.id === data.id);
  if (idx === -1) return { ok: false };
  if (data.status) apps[idx].status = data.status;
  if (data.admin_notes !== undefined) apps[idx].admin_notes = data.admin_notes;
  saveApplications(apps);
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
    const eng = Math.floor(Math.random() * 4) + 6;
    const comm = Math.floor(Math.random() * 4) + 6;
    const exp = Math.floor(Math.random() * 4) + 5;
    apps[idx].english_score = eng;
    apps[idx].comm_score = comm;
    apps[idx].exp_score = exp;
    apps[idx].total_score = eng + comm + exp;
    apps[idx].ai_notes = "Re-scored by QuickHire AI. " + new Date().toLocaleString();
    apps[idx].scoring_status = "done";
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
  const offers = typeof window !== "undefined"
    ? (() => {
        try {
          const raw = localStorage.getItem("qh_offers");
          return raw ? JSON.parse(raw) : BUILT_IN_OFFERS;
        } catch {
          return BUILT_IN_OFFERS;
        }
      })()
    : BUILT_IN_OFFERS;
  return {
    total: apps.length,
    today: apps.filter((a) => a.created_at >= since).length,
    shortlisted: apps.filter((a) => a.status === "shortlisted").length,
    activeOffers: offers.filter((o: { status: string }) => o.status === "active").length,
  };
}
