import type { Offer, OfferWithPhone } from "./offers.types";
import { BUILT_IN_OFFERS } from "./data";

async function getStoredOffers(): Promise<OfferWithPhone[]> {
  if (typeof window === "undefined") return [...BUILT_IN_OFFERS];

  // 1. Dev mode: read from Vite server API
  if (import.meta.env.DEV) {
    try {
      const res = await fetch(`/api/db/offers?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("qh_offers_v2", JSON.stringify(data));
        return data as OfferWithPhone[];
      }
    } catch (e) {
      console.warn("Local DB API fetch failed, falling back to localStorage", e);
    }
    return [...BUILT_IN_OFFERS];
  }

  // 2. Prod mode: fallback to localStorage
  try {
    const raw = localStorage.getItem("qh_offers_v2");
    if (!raw) {
      localStorage.setItem("qh_offers_v2", JSON.stringify(BUILT_IN_OFFERS));
      return [...BUILT_IN_OFFERS];
    }
    return JSON.parse(raw) as OfferWithPhone[];
  } catch {
    return [...BUILT_IN_OFFERS];
  }
}

async function saveOffers(offers: OfferWithPhone[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("qh_offers_v2", JSON.stringify(offers));

  // Save to Vite server file in dev
  if (import.meta.env.DEV) {
    try {
      await fetch("/api/db/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(offers),
      });
    } catch (e) {
      console.warn("Local DB API save failed", e);
    }
  }
}

function anonymizeCompany(company: string): string {
  const c = company.toLowerCase().trim();
  if (c.includes("hsbc") || c.includes("bank")) return "Leading Global Bank";
  if (c.includes("vodafone") || c.includes("e&") || c.includes("telecom") || c.includes("orange") || c.includes("etisalat")) return "Major Telecom Multinational";
  if (
    c.includes("teleperformance") ||
    c.includes("concentrix") ||
    c.includes("konecta") ||
    c.includes("ttec") ||
    c.includes("sutherland") ||
    c.includes("foundever") ||
    c.includes("intelcia") ||
    c.includes("vxi") ||
    c.includes("alorica") ||
    c.includes("bpo") ||
    c.includes("outsourcing")
  ) {
    return "Top BPO Multinational";
  }
  if (c.includes("tamara") || c.includes("fintech") || c.includes("payment")) return "Leading Fintech Company";
  if (c.includes("enpal")) return "Leading German Tech Company";
  if (c.includes("ison") || c.includes("eclerx") || c.includes("igt")) return "Global Outsourcing Leader";
  return "Confidential Company";
}

function anonymizeLocation(loc: string): string {
  if (!loc) return "Egypt";
  const l = loc.toLowerCase();
  if (l.includes("smart village")) return "Giza – Smart Village";
  if (l.includes("maadi")) return "Cairo – Maadi";
  if (l.includes("new cairo") || l.includes("5th settlement") || l.includes("plaza") || l.includes("katamya") || l.includes("kattameya") || l.includes("tagamoa")) return "Cairo – New Cairo";
  if (l.includes("nasr city")) return "Cairo – Nasr City";
  if (l.includes("shobra") || l.includes("shubra") || l.includes("shoubra")) return "Cairo – Shubra";
  if (l.includes("sheikh zayed") || l.includes("zayed") || l.includes("6th of october") || l.includes("october")) return "Giza – 6th of October";
  if (l.includes("alexandria")) return "Alexandria";
  if (l.includes("work from home") || l.includes("remote") || l.includes("home")) return "Work From Home";
  return "Cairo";
}

function scrubOfferForPublic(offer: OfferWithPhone): Offer {
  const anonCompany = anonymizeCompany(offer.company);
  const anonLocation = anonymizeLocation(offer.location);
  
  // Replace real company name and location details in text fields
  const companyRegex = new RegExp(offer.company.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
  
  let title = offer.title.replace(companyRegex, anonCompany);
  let summary = offer.summary.replace(companyRegex, anonCompany).replace(offer.location, anonLocation);
  
  // Scrub description lines
  let descriptionLines = offer.description.split('\n');
  descriptionLines = descriptionLines.filter(line => {
    const l = line.toLowerCase();
    // Remove map links or specific address details
    if (l.includes('location link:') || l.includes('http://maps') || l.includes('https://maps') || l.includes('https://g.co')) {
      return false;
    }
    return true;
  });
  
  let description = descriptionLines.join('\n')
    .replace(companyRegex, anonCompany)
    .replace(offer.location, anonLocation);
    
  // Also replace any specific interview site details or address headers
  description = description.replace(/👥 \*\*Interview Format:\*\*.*$/mi, '👥 **Interview Format:** Face-to-face or Online Interview');
  description = description.replace(/📍 \*\*Work Location:\*\*.*$/mi, `📍 **Work Location:** ${anonLocation}`);

  const { hr_phone: _hp, ...rest } = offer;
  
  return {
    ...rest,
    title,
    company: anonCompany,
    location: anonLocation,
    summary,
    description: description.trim(),
  };
}

export async function listOffers(): Promise<Offer[]> {
  const offers = await getStoredOffers();
  return offers
    .filter((o) => o.status === "active" || o.status === "on_hold")
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .map((o) => scrubOfferForPublic(o));
}

export async function getOfferBySlug({ data }: { data: { slug: string } }): Promise<Offer | null> {
  const offers = await getStoredOffers();
  const offer = offers.find((o) => o.slug === data.slug && (o.status === "active" || o.status === "on_hold"));
  if (!offer) return null;
  return scrubOfferForPublic(offer);
}

export async function adminListOffers(): Promise<OfferWithPhone[]> {
  const offers = await getStoredOffers();
  return offers.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function upsertOffer({ data }: { data: Partial<OfferWithPhone> & { slug: string; title: string; company: string } }): Promise<{ id: string }> {
  const offers = await getStoredOffers();
  if (data.id) {
    const idx = offers.findIndex((o) => o.id === data.id);
    if (idx !== -1) {
      offers[idx] = { ...offers[idx], ...data } as OfferWithPhone;
    } else {
      offers.unshift({ ...(data as OfferWithPhone), created_at: new Date().toISOString() });
    }
    await saveOffers(offers);
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
  await saveOffers(offers);
  return { id };
}

export async function deleteOffer({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const offers = (await getStoredOffers()).filter((o) => o.id !== data.id);
  await saveOffers(offers);
  return { ok: true };
}
