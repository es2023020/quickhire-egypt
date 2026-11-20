export const config = {
  runtime: "nodejs",
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
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

  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY ||
    "";

  if (!apiKey) {
    return res.status(500).json({
      error: "OpenRouter API Key not configured on the server.",
      fallback: true,
    });
  }

  const model =
    process.env.OPENROUTER_MODEL ||
    process.env.VITE_OPENROUTER_MODEL ||
    DEFAULT_MODEL;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { applicant, offer } = body || {};

    if (!applicant) {
      return res.status(400).json({ error: "Missing applicant data." });
    }

    const offerSummary = offer
      ? `Job Title: ${offer.title} at ${offer.company}
Category: ${offer.category || "Customer Support"}
Target Language: ${offer.language || "English"}
Location: ${offer.location || "Cairo, Egypt"}
Salary Offered: ${offer.salary_text || "Competitive"}
Mandatory Requirements:
${(offer.requirements || ["Fluency in English", "Customer-oriented mindset"]).map((r: string) => `- ${r}`).join("\n")}`
      : "Standard BPO Customer Operations Role (Requires C1/B2 English, good communication, coachability)";

    const answersText = applicant.answers
      ? Object.entries(applicant.answers)
          .map(([q, a]) => `Q: ${q}\nA: ${typeof a === "object" ? JSON.stringify(a) : a}`)
          .join("\n")
      : "No additional custom questions answered.";

    const voiceNoteInfo = applicant.voice_notes?.length
      ? applicant.voice_notes
          .map((v: { lang?: string }, i: number) => `Voice Note #${i + 1} (${v.lang || "en"}): [Audio recorded and attached]`)
          .join("\n")
      : "No voice note submitted.";

    const systemPrompt = `You are QuickHire Egypt's expert AI Recruitment Officer for premier BPO and tech accounts in Egypt (Vodafone UK, Concentrix, Sutherland, Teleperformance, Webhelp).

Your task is to thoroughly analyze the candidate's profile, qualifications, submitted answers, and voice records, comparing them rigorously against the job's stated requirements.

Grading Criteria:
1. english_score (0.0 to 10.0):
   - Assess pronunciation, fluency, grammar, accent clarity, and vocabulary suitable for native English customers (UK/US).
   - If candidate claims C1/Fluent, verify if their answers and speech reflect C1 standards.
2. comm_score (0.0 to 10.0):
   - Assess problem-solving ability, empathy, de-escalation tone, professionalism, and clarity of thought.
3. exp_score (0.0 to 10.0):
   - Compare past experience (years, call center/support background, tools used) against the specific job requirements.
4. total_score (0.0 to 30.0):
   - Sum of (english_score + comm_score + exp_score).
5. ai_notes:
   - Exactly 2 to 3 sentences in professional recruiter tone.
   - Highlight: (1) Key strength, (2) Any gap or dealbreaker against job qualifications, (3) Final hiring verdict or recommended account fit.

Output Format:
You MUST respond with valid JSON ONLY. No markdown quotes, no triple backticks, no explanatory prose outside the JSON:
{
  "english_score": 8.5,
  "comm_score": 8.0,
  "exp_score": 7.5,
  "total_score": 24.0,
  "ai_notes": "Candidate demonstrates clear B2+ fluency with strong customer empathy. 2 years of relevant chat support makes them a solid fit for Vodafone UK, though overnight shift flexibility should be confirmed in the final interview."
}`;

    const userPrompt = `=== TARGET JOB QUALIFICATIONS ===
${offerSummary}

=== CANDIDATE PROFILE ===
Name: ${applicant.full_name}
Declared English Level: ${applicant.english_level || "Not specified"}
Experience: ${applicant.experience_years ?? 0} years
Graduation Status: ${applicant.grad_status || "Graduate"}
Location: ${applicant.location || "Cairo / Giza"}
Salary Expectation: ${applicant.salary_expectation || "Flexible"}

=== CUSTOM FORM QUESTIONS & CANDIDATE ANSWERS ===
${answersText}

=== VOICE NOTE SUBMISSIONS ===
${voiceNoteInfo}

=== CV / RESUME ATTACHMENT ===
${applicant.cv_path || applicant.cv_data ? "CV Document uploaded & reviewed." : "No CV uploaded."}

Now evaluate and score this applicant strictly according to the target job qualifications. Output valid JSON only.`;

    const openrouterRes = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quickhire.eg",
        "X-Title": "QuickHire Egypt Serverless Engine",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!openrouterRes.ok) {
      const err = await openrouterRes.text();
      console.error("[QuickHire Serverless] OpenRouter error:", openrouterRes.status, err);
      return res.status(502).json({ error: "OpenRouter upstream error", details: err });
    }

    const resJson = await openrouterRes.json();
    const rawContent = resJson.choices?.[0]?.message?.content || "";

    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI score format", raw: rawContent });
    }

    const eng = Math.min(10, Math.max(1, Number(parsed.english_score) || 7));
    const comm = Math.min(10, Math.max(1, Number(parsed.comm_score) || 7));
    const exp = Math.min(10, Math.max(1, Number(parsed.exp_score) || 6));
    const total = Math.round((eng + comm + exp) * 10) / 10;

    return res.status(200).json({
      english_score: Math.round(eng * 10) / 10,
      comm_score: Math.round(comm * 10) / 10,
      exp_score: Math.round(exp * 10) / 10,
      total_score: total,
      ai_notes: parsed.ai_notes || "Candidate evaluated by QuickHire AI against role requirements.",
      scoring_status: "done",
      scoring_model: model,
    });
  } catch (err: any) {
    console.error("[QuickHire Serverless] Exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
