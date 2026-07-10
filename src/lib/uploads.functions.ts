// Server-only helper — creates an anon-restricted, one-time signed upload URL
// so the browser can PUT files directly to storage without exposing the
// service key.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        bucket: z.enum(["cvs", "voice-notes"]),
        filename: z.string().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${crypto.randomUUID()}/${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "upload url failed");
    return { path: signed.path, token: signed.token, url: signed.signedUrl };
  });
