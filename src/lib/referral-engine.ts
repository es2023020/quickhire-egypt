// QuickHire Viral Referral & Ambassador Engine for Foreign Languages and BPO Mass Hiring

export interface LanguageBounty {
  language: string;
  flag: string;
  bountyEgp: number;
  avgSalaryText: string;
  demandLevel: "Very High" | "High" | "Urgent";
}

export const LANGUAGE_BOUNTIES: LanguageBounty[] = [
  { language: "German (C1/B2)", flag: "🇩🇪", bountyEgp: 3000, avgSalaryText: "35,000 – 48,000 EGP", demandLevel: "Urgent" },
  { language: "French (B2/C1)", flag: "🇫🇷", bountyEgp: 2500, avgSalaryText: "26,000 – 38,000 EGP", demandLevel: "Very High" },
  { language: "Italian (B2/C1)", flag: "🇮🇹", bountyEgp: 2000, avgSalaryText: "24,000 – 34,000 EGP", demandLevel: "Very High" },
  { language: "Dutch (B2/C1)", flag: "🇳🇱", bountyEgp: 3500, avgSalaryText: "40,000 – 55,000 EGP", demandLevel: "Urgent" },
  { language: "English (C1 / Sales)", flag: "🇬🇧", bountyEgp: 1000, avgSalaryText: "16,000 – 26,000 EGP", demandLevel: "High" },
];

export function generateCandidateReferralCode(name: string, phone: string): string {
  const firstName = (name || "QH").trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "CANDIDATE";
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const tail = cleanPhone.slice(-4) || Math.floor(1000 + Math.random() * 9000).toString();
  return `REF-${firstName}-${tail}`;
}

export function buildCandidateShareUrl(code: string, offerSlug?: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://quickhire.eg";
  if (offerSlug) {
    return `${base}/offers/${offerSlug}/apply?ref=${encodeURIComponent(code)}`;
  }
  return `${base}/offers?ref=${encodeURIComponent(code)}`;
}

export function buildCandidateReferralShareMessage({
  referrerName,
  code,
  offerTitle,
  company,
  shareUrl,
}: {
  referrerName: string;
  code: string;
  offerTitle?: string;
  company?: string;
  shareUrl: string;
}): string {
  const jobMention = offerTitle
    ? `وظيفة *${offerTitle}* ${company ? `في *${company}*` : ""}`
    : "وظائف كول سنتر وسيلز بأعلى مرتبات في مصر";

  return `🔥 فرصة شغل ممتازة مع QuickHire!
أنا رشحتك لـ ${jobMention}.

🌟 مرتبات بتبدأ من 16,000 لحد 48,000+ جنيه شهرياً للغات (English, German, French, Italian, Dutch)
✅ مواصلات مجانية من أقرب محطة مترو
✅ تأمين طبي واجتماعي كامل من أول يوم
✅ التقديم وتسجيل الفويس أونلاين بياخد 3 دقايق بس!

🔗 قدم فورا من اللينك ده (كود الترشيح بتاعي: ${code}):
${shareUrl}

بالتوفيق!`;
}

export function buildAdminReferralRequestWhatsApp({
  candidateName,
  phone,
  code,
  score,
}: {
  candidateName: string;
  phone: string;
  code: string;
  score?: number | null;
}): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
  const msg = `أهلاً يا ${candidateName.split(" ")[0]} 👋
معاك فريق توظيف QuickHire.

تقييمك معانا ما شاء الله ممتاز${score ? ` (${score}/30)` : ""}!
حابب أفكرك إن عندنا *برنامج مكافآت ترشيح (Referral Bonus)*:
لو عندك أي حد من صحابك أو دفعتك بيتكلم:
🇩🇪 ألماني: مكافأة 3,000 ج
🇫🇷 فرنساوي: مكافأة 2,500 ج
🇮🇹 إيطالي: مكافأة 2,000 ج
🇬🇧 إنجليزي فلوينت C1: مكافأة 1,000 ج

كودك الخاص للترشيح: *${code}*
خليهم يدخلوا يسجلوا من الرابط ده ويكتبوا كودك:
https://quickhire.eg/offers?ref=${encodeURIComponent(code)}

المكافأة بتتحولك على فودافون كاش أو إنستاباي فور تعيينهم! 🎉`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}
