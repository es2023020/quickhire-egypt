import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { Offer, OfferWithPhone } from "./offers.types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const SAFE_COLS =
  "id, slug, title, company, category, language, salary_text, salary_min, location, shift_type, summary, description, requirements, benefits, form_schema, status, featured, created_at";

export const listOffers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("offers")
    .select(SAFE_COLS)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Offer[];
});

export const getOfferBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("offers")
      .select(SAFE_COLS)
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row as unknown as Offer;
  });

async function requireAdmin(ctx: {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
}) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as OfferWithPhone[];
  });

const OfferInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(80),
  title: z.string().min(2).max(160),
  company: z.string().min(1),
  category: z.string().min(1),
  language: z.string().nullable().optional(),
  salary_text: z.string().min(1),
  salary_min: z.number().int().nullable().optional(),
  location: z.string().min(1),
  shift_type: z.string().nullable().optional(),
  summary: z.string().min(1),
  description: z.string().min(1),
  requirements: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  form_schema: z
    .object({
      voice_notes: z
        .array(z.object({ lang: z.string(), prompt: z.string() }))
        .optional(),
    })
    .default({}),
  hr_phone: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  featured: z.boolean().default(false),
});

export const upsertOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OfferInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase
        .from("offers")
        .update(rest)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase
      .from("offers")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("offers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
