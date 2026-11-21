import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://nwkztzuwmrceixlnkuui.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[QuickHire Storage] SUPABASE_SERVICE_ROLE_KEY is not set on the server.");
    return res.status(500).json({ error: "Server storage configuration missing." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { bucket, fileName, fileData, candidateId, contentType } = body || {};

    if (!bucket || !["resumes", "voice-notes"].includes(bucket)) {
      return res.status(400).json({ error: "Invalid bucket. Must be 'resumes' or 'voice-notes'." });
    }

    if (!fileData || typeof fileData !== "string") {
      return res.status(400).json({ error: "Missing or invalid fileData (base64 string required)." });
    }

    // Parse Base64 string
    let mimeType = contentType;
    let base64Content = fileData;

    if (fileData.startsWith("data:")) {
      const match = fileData.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        if (!mimeType) mimeType = match[1];
        base64Content = match[2];
      }
    }

    if (!mimeType) {
      mimeType = bucket === "resumes" ? "application/pdf" : "audio/webm";
    }

    const buffer = Buffer.from(base64Content, "base64");
    if (buffer.length === 0) {
      return res.status(400).json({ error: "Decoded file buffer is empty." });
    }

    // Check size limit: 15MB
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: "File size exceeds 15MB limit." });
    }

    const safeCandidateId = (candidateId || "anon").replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanFileName = (fileName || (bucket === "resumes" ? "resume.pdf" : "recording.webm"))
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${safeCandidateId}/${Date.now()}_${cleanFileName}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr) {
      console.error("[QuickHire Storage Upload Error]:", uploadErr);
      return res.status(500).json({ error: uploadErr.message });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return res.status(200).json({
      ok: true,
      bucket,
      path: filePath,
      publicUrl: urlData.publicUrl,
      size: buffer.length,
      mimeType,
    });
  } catch (err: any) {
    console.error("[QuickHire Storage Exception]:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
