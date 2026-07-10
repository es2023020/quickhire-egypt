// Server-only helpers for AI scoring & transcription via Lovable AI Gateway.
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

export async function transcribeAudio(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "openai/gpt-4o-mini-transcribe");
  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Transcription failed [${res.status}]: ${t}`);
  }
  const j = (await res.json()) as { text?: string };
  return j.text ?? "";
}

export type RubricScore = {
  english: number;
  communication: number;
  experience: number;
  notes: string;
};

export async function scoreCandidate(input: {
  offerTitle: string;
  offerRequirements: string[];
  transcripts: { lang: string; text: string }[];
  cvText: string | null;
  englishLevel: string | null;
  experienceYears: number | null;
}): Promise<RubricScore> {
  const system = `You are an expert HR screening AI for Egyptian call center & sales roles.
Score each candidate strictly on three dimensions from 0 to 10 (integers) based ONLY on evidence.
Return valid JSON only.`;

  const transcriptBlock =
    input.transcripts
      .map((t) => `--- ${t.lang} voice note transcript ---\n${t.text || "(empty)"}`)
      .join("\n\n") || "(no voice notes provided)";

  const user = `Role: ${input.offerTitle}
Requirements:
${input.offerRequirements.map((r) => `- ${r}`).join("\n")}

Candidate self-reported English level: ${input.englishLevel ?? "unknown"}
Candidate self-reported years of experience: ${input.experienceYears ?? "unknown"}

CV extract (may be empty):
${(input.cvText ?? "").slice(0, 4000)}

Voice notes:
${transcriptBlock}

Score:
- english: fluency, grammar, vocabulary from voice transcripts (0-10)
- communication: clarity, confidence, structure of the introduction (0-10)
- experience: fit vs role requirements based on CV + transcripts (0-10)
- notes: 2-3 sentence hiring recommendation.

Reply ONLY with JSON: {"english": n, "communication": n, "experience": n, "notes": "..."}`;

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Scoring failed [${res.status}]: ${t}`);
  }
  const j = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = j.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as Partial<RubricScore>;
  const clamp = (n: unknown) =>
    Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
  return {
    english: clamp(parsed.english),
    communication: clamp(parsed.communication),
    experience: clamp(parsed.experience),
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
  };
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const mod = (await import("pdf-parse")) as unknown as {
      default: (data: Buffer) => Promise<{ text: string }>;
    };
    const buf = Buffer.from(bytes);
    const out = await mod.default(buf);
    return out.text ?? "";
  } catch (e) {
    console.error("pdf-parse failed", e);
    return "";
  }
}
