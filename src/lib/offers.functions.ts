import type { Offer, OfferWithPhone } from "./offers.types";
import { supabase } from "@/integrations/supabase/client";
import { BUILT_IN_OFFERS } from "./data";

// ─── Company / Location anonymisation helpers ───────────────────────────────

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

  const companyRegex = new RegExp(offer.company.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
  let title = offer.title.replace(companyRegex, anonCompany);
  let summary = offer.summary.replace(companyRegex, anonCompany).replace(offer.location, anonLocation);

  let descriptionLines = offer.description.split('\n');
  descriptionLines = descriptionLines.filter(line => {
    const l = line.toLowerCase();
    if (l.includes('location link:') || l.includes('http://maps') || l.includes('https://maps') || l.includes('https://g.co')) {
      return false;
    }
    return true;
  });

  let description = descriptionLines.join('\n')
    .replace(companyRegex, anonCompany)
    .replace(offer.location, anonLocation);

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

// ─── Internal: fetch all offers from Supabase ────────────────────────────────

async function getStoredOffers(): Promise<OfferWithPhone[]> {
  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[QuickHire] Supabase offers fetch error, falling back:", error.message);
      return [...BUILT_IN_OFFERS];
    }

    if (!data || data.length === 0) {
      return [...BUILT_IN_OFFERS];
    }

    return data.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      company: row.company,
      category: row.category,
      language: row.language ?? null,
      salary_text: row.salary_text ?? "TBC",
      salary_min: row.salary_min ?? null,
      location: row.location,
      shift_type: row.shift_type ?? null,
      summary: row.summary ?? "",
      description: row.description ?? "",
      requirements: Array.isArray(row.requirements) ? row.requirements : [],
      benefits: Array.isArray(row.benefits) ? row.benefits : [],
      form_schema: (row.form_schema as { voice_notes?: { lang: string; prompt: string }[] }) ?? {},
      hr_phone: row.hr_phone ?? null,
      status: row.status ?? "active",
      featured: row.featured ?? false,
      created_at: row.created_at,
    })) as OfferWithPhone[];
  } catch (err) {
    console.warn("[QuickHire] getStoredOffers unexpected error:", err);
    return [...BUILT_IN_OFFERS];
  }
}

// ─── Public: list active offers (scrubbed) ───────────────────────────────────

export async function listOffers(): Promise<Offer[]> {
  const offers = await getStoredOffers();
  return offers
    .filter((o) => o.status === "active" || o.status === "on_hold")
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .map((o) => scrubOfferForPublic(o));
}

export async function getOfferBySlug({ data }: { data: { slug: string } }): Promise<Offer | null> {
  try {
    const { data: row, error } = await supabase
      .from("offers")
      .select("*")
      .eq("slug", data.slug)
      .in("status", ["active", "on_hold"])
      .maybeSingle();

    if (error || !row) return null;

    const offer: OfferWithPhone = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      company: row.company,
      category: row.category,
      language: row.language ?? null,
      salary_text: row.salary_text ?? "TBC",
      salary_min: row.salary_min ?? null,
      location: row.location,
      shift_type: row.shift_type ?? null,
      summary: row.summary ?? "",
      description: row.description ?? "",
      requirements: Array.isArray(row.requirements) ? row.requirements : [],
      benefits: Array.isArray(row.benefits) ? row.benefits : [],
      form_schema: (row.form_schema as { voice_notes?: { lang: string; prompt: string }[] }) ?? {},
      hr_phone: row.hr_phone ?? null,
      status: row.status ?? "active",
      featured: row.featured ?? false,
      created_at: row.created_at,
    };

    return scrubOfferForPublic(offer);
  } catch (err) {
    console.warn("[QuickHire] getOfferBySlug error:", err);
    return null;
  }
}

// ─── Admin: list all offers (unredacted) ─────────────────────────────────────

export async function adminListOffers(): Promise<OfferWithPhone[]> {
  return getStoredOffers();
}

// ─── Admin: create or update an offer ────────────────────────────────────────

export async function upsertOffer({ data }: {
  data: Partial<OfferWithPhone> & { slug: string; title: string; company: string };
}): Promise<{ id: string }> {
  if (data.id) {
    // Update existing
    const { error } = await supabase
      .from("offers")
      .update({
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
        hr_phone: data.hr_phone ?? null,
        status: data.status ?? "active",
        featured: data.featured ?? false,
      })
      .eq("id", data.id);

    if (error) throw new Error(`Failed to update offer: ${error.message}`);
    return { id: data.id };
  }

  // Insert new
  const { data: inserted, error } = await supabase
    .from("offers")
    .insert({
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
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error(`Failed to insert offer: ${error?.message}`);
  return { id: inserted.id };
}

// ─── Admin: delete offer ──────────────────────────────────────────────────────

export async function deleteOffer({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("offers").delete().eq("id", data.id);
  if (error) throw new Error(`Failed to delete offer: ${error.message}`);
  return { ok: true };
}
