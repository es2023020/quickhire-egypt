import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

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

const SubmitInput = z.object({
  offer_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  age: z.number().int().min(15).max(70).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  grad_status: z.string().max(60).nullable().optional(),
  english_level: z.string().max(20).nullable().optional(),
  experience_years: z.number().int().min(0).max(50).nullable().optional(),
  salary_expectation: z.string().max(60).nullable().optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
  cv_path: z.string().max(500).nullable().optional(),
  voice_notes: z
    .array(z.object({ lang: z.string(), path: z.string() }))
    .default([]),
});

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("applications")
      .insert({
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
        answers: data.answers as Json,
        cv_path: data.cv_path ?? null,
        voice_notes: data.voice_notes as unknown as Json,
        scoring_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Fire-and-forget scoring (await here for reliability in serverless runtime)
    try {
      const { scoreApplicationInternal } = await import("./scoring.server");
      await scoreApplicationInternal(row.id as string);
    } catch (e) {
      console.error("scoring failed", e);
    }

    return { id: row.id as string };
  });

export const adminListApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        offer_id: z.string().uuid().nullable().optional(),
        status: z.string().nullable().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    let q = context.supabase
      .from("applications")
      .select("*, offer:offers(title, slug, company)")
      .order("total_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (data.offer_id) q = q.eq("offer_id", data.offer_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return JSON.parse(JSON.stringify(rows ?? [])) as AdminApplicationRow[];
  });

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

export const adminGetApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row, error } = await context.supabase
      .from("applications")
      .select("*, offer:offers(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return JSON.parse(JSON.stringify(row)) as AdminApplicationDetail | null;
  });

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

export const adminUpdateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "shortlisted", "rejected", "hired"]).optional(),
        admin_notes: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const patch: { status?: string; admin_notes?: string } = {};
    if (data.status) patch.status = data.status;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await context.supabase
      .from("applications")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        bucket: z.enum(["cvs", "voice-notes"]),
        path: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 60);
    if (error || !signed) throw new Error(error?.message ?? "Signed URL failed");
    return { url: signed.signedUrl };
  });

export const adminRescore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { scoreApplicationInternal } = await import("./scoring.server");
    await scoreApplicationInternal(data.id);
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { count: total } = await context.supabase
      .from("applications")
      .select("*", { count: "exact", head: true });
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: today } = await context.supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    const { count: shortlisted } = await context.supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "shortlisted");
    const { count: activeOffers } = await context.supabase
      .from("offers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    return {
      total: total ?? 0,
      today: today ?? 0,
      shortlisted: shortlisted ?? 0,
      activeOffers: activeOffers ?? 0,
    };
  });
