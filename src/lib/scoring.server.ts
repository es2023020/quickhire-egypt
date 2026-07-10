// Server-only scoring pipeline (called from applications.submit + admin rescore).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { transcribeAudio, scoreCandidate, extractPdfText } from "./ai.server";

export async function scoreApplicationInternal(applicationId: string) {
  await supabaseAdmin
    .from("applications")
    .update({ scoring_status: "processing" })
    .eq("id", applicationId);

  const { data: app, error } = await supabaseAdmin
    .from("applications")
    .select("*, offer:offers(title, requirements)")
    .eq("id", applicationId)
    .single();
  if (error || !app) throw new Error(error?.message ?? "app not found");

  const voiceNotes = (app.voice_notes ?? []) as { lang: string; path: string }[];
  const transcripts: { lang: string; text: string }[] = [];
  const transcriptMap: Record<string, string> = {};

  for (const vn of voiceNotes) {
    try {
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from("voice-notes")
        .download(vn.path);
      if (dlErr || !file) throw dlErr ?? new Error("no file");
      const text = await transcribeAudio(file, vn.path.split("/").pop() ?? "audio.webm");
      transcripts.push({ lang: vn.lang, text });
      transcriptMap[vn.lang] = text;
    } catch (e) {
      console.error("transcribe fail", vn.path, e);
      transcripts.push({ lang: vn.lang, text: "" });
    }
  }

  let cvText: string | null = null;
  if (app.cv_path) {
    try {
      const { data: file } = await supabaseAdmin.storage.from("cvs").download(app.cv_path);
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (app.cv_path.toLowerCase().endsWith(".pdf")) {
          cvText = await extractPdfText(bytes);
        } else {
          cvText = new TextDecoder().decode(bytes).slice(0, 20000);
        }
      }
    } catch (e) {
      console.error("cv read fail", e);
    }
  }

  const offer = (app.offer ?? {}) as { title?: string; requirements?: string[] };

  let scores;
  try {
    scores = await scoreCandidate({
      offerTitle: offer.title ?? "",
      offerRequirements: (offer.requirements as string[]) ?? [],
      transcripts,
      cvText,
      englishLevel: app.english_level ?? null,
      experienceYears: app.experience_years ?? null,
    });
  } catch (e) {
    console.error("scoring model failed", e);
    await supabaseAdmin
      .from("applications")
      .update({ scoring_status: "failed", transcripts: transcriptMap })
      .eq("id", applicationId);
    return;
  }

  const total = scores.english + scores.communication + scores.experience;

  await supabaseAdmin
    .from("applications")
    .update({
      english_score: scores.english,
      comm_score: scores.communication,
      exp_score: scores.experience,
      total_score: total,
      ai_notes: scores.notes,
      transcripts: transcriptMap,
      scoring_status: "done",
    })
    .eq("id", applicationId);
}
