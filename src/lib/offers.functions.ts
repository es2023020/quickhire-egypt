import type { Offer, OfferWithPhone } from "./offers.types";
import { BUILT_IN_OFFERS } from "./data";

function getStoredOffers(): OfferWithPhone[] {
  if (typeof window === "undefined") return [...BUILT_IN_OFFERS];
  try {
    const raw = localStorage.getItem("qh_offers");
    if (!raw) {
      localStorage.setItem("qh_offers", JSON.stringify(BUILT_IN_OFFERS));
      return [...BUILT_IN_OFFERS];
    }
    return JSON.parse(raw) as OfferWithPhone[];
  } catch {
    return [...BUILT_IN_OFFERS];
  }
}

function saveOffers(offers: OfferWithPhone[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("qh_offers", JSON.stringify(offers));
}

export async function listOffers(): Promise<Offer[]> {
  const offers = getStoredOffers();
  return offers
    .filter((o) => o.status === "active")
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .map(({ hr_phone: _hp, ...o }) => o);
}

export async function getOfferBySlug({ data }: { data: { slug: string } }): Promise<Offer | null> {
  const offers = getStoredOffers();
  const offer = offers.find((o) => o.slug === data.slug && o.status === "active");
  if (!offer) return null;
  const { hr_phone: _hp, ...rest } = offer;
  return rest;
}

export async function adminListOffers(): Promise<OfferWithPhone[]> {
  return getStoredOffers().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function upsertOffer({ data }: { data: Partial<OfferWithPhone> & { slug: string; title: string; company: string } }): Promise<{ id: string }> {
  const offers = getStoredOffers();
  if (data.id) {
    const idx = offers.findIndex((o) => o.id === data.id);
    if (idx !== -1) {
      offers[idx] = { ...offers[idx], ...data } as OfferWithPhone;
    } else {
      offers.unshift({ ...(data as OfferWithPhone), created_at: new Date().toISOString() });
    }
    saveOffers(offers);
    return { id: data.id };
  }
  const id = `offer-${Date.now()}`;
  offers.unshift({
    id,
    slug: data.slug,
    title: data.title,
    company: data.company,
    category: data.category ?? "Sales Representative",
    language: data.language ?? null,
    salary_text: data.salary_text ?? "TBC",
    salary_min: data.salary_min ?? null,
    location: data.location ?? "Cairo",
    shift_type: data.shift_type ?? null,
    summary: data.summary ?? "",
    description: data.description ?? "",
    requirements: data.requirements ?? [],
    benefits: data.benefits ?? [],
    form_schema: data.form_schema ?? {},
    hr_phone: data.hr_phone ?? "+201029324783",
    status: data.status ?? "active",
    featured: data.featured ?? false,
    created_at: new Date().toISOString(),
  });
  saveOffers(offers);
  return { id };
}

export async function deleteOffer({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const offers = getStoredOffers().filter((o) => o.id !== data.id);
  saveOffers(offers);
  return { ok: true };
}
