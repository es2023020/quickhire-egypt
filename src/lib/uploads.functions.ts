// File uploads are handled client-side as base64 data URLs (no external storage).
// Supabase storage has been removed — all data is built-in via localStorage.
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
  .handler(async () => {
    // No external storage — return empty values; client handles uploads as data URLs
    return { path: "", token: "", url: "" };
  });
