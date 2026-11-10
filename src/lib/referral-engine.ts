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

/**
 * Phonetically transliterates Egyptian Arabic first names to clean English handles
 */
export function transliterateArabicToEnglish(text: string): string {
  const clean = (text || "").trim();
  const firstWord = clean.split(/\s+/)[0] || "";

  const commonNames: Record<string, string> = {
    "محمد": "MOHAMED", "محمود": "MAHMOUD", "احمد": "AHMED", "أحمد": "AHMED", "إحمد": "AHMED",
    "عمر": "OMAR", "عمرو": "AMR", "علي": "ALI", "على": "ALI", "حسن": "HASSAN", "حسين": "HUSSEIN",
    "سارة": "SARAH", "ساره": "SARAH", "نور": "NOUR", "نورهان": "NOURHAN", "كريم": "KARIM",
    "مريم": "MARYAM", "يوسف": "YOUSSEF", "مصطفى": "MOSTAFA", "مصطفي": "MOSTAFA",
    "إبراهيم": "IBRAHIM", "ابراهيم": "IBRAHIM", "خالد": "KHALED", "طارق": "TAREK", "زياد": "ZIAD",
    "حازم": "HAZEM", "ياسمين": "YASMINE", "منة": "MENNA", "منه": "MENNA", "آية": "AYA", "اية": "AYA",
    "فاطمة": "FATMA", "فاطمه": "FATMA", "رانيا": "RANIA", "دينا": "DINA", "هدى": "HODA", "هدي": "HODA",
    "منى": "MONA", "مني": "MONA", "شريف": "SHERIF", "حسام": "HOSSAM", "وليد": "WALID", "رامي": "RAMY",
    "ماجد": "MAGED", "عادل": "ADEL", "سامح": "SAMEH", "هشام": "HISHAM", "إسلام": "ESLAM", "اسلام": "ESLAM",
    "بلال": "BELAL", "جمال": "GAMAL", "أيمن": "AYMAN", "ايمن": "AYMAN", "يحيى": "YAHIA", "حمزة": "HAMZA",
    "أسامة": "OSSAMA", "اسامة": "OSSAMA", "تامر": "TAMER", "هاني": "HANY", "وائل": "WAEL", "هبة": "HEBA",
    "مي": "MAY", "نادين": "NADINE", "سلمى": "SALMA", "شروق": "SHOROUK", "مروان": "MARWAN", "ياسين": "YASSIN",
    "مازن": "MAZEN", "باسم": "BASSEM", "أمير": "AMIR", "امير": "AMIR", "شهاب": "SHEHAB"
  };

  if (commonNames[firstWord]) return commonNames[firstWord];

  // Character mapping
  const charMap: Record<string, string> = {
    'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'A', 'ء': 'A',
    'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'G', 'ح': 'H',
    'خ': 'KH', 'د': 'D', 'ذ': 'Z', 'ر': 'R', 'ز': 'Z',
    'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T',
    'ظ': 'Z', 'ع': 'A', 'غ': 'GH', 'ف': 'F', 'ق': 'Q',
    'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H',
    'و': 'W', 'ي': 'Y', 'ى': 'A', 'ة': 'A'
  };

  let transliterated = "";
  for (const ch of firstWord) {
    if (charMap[ch]) {
      transliterated += charMap[ch];
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      transliterated += ch.toUpperCase();
    }
  }

  return transliterated || "AMBASSADOR";
}

/**
 * Extracts a clean uppercase first name handle suitable for referral codes
 */
export function extractCleanFirstName(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "AMBASSADOR";

  // Check if contains Arabic characters
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return transliterateArabicToEnglish(trimmed).slice(0, 10).toUpperCase();
  }

  // English first name
  const firstWord = trimmed.split(/\s+/)[0] || "";
  const cleaned = firstWord.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (cleaned.slice(0, 10) || "AMBASSADOR");
}

/**
 * Generates an individualized referral code derived from the person's name and phone number.
 * Ensures uniqueness by checking against existing codes.
 * Format: REF-[FIRSTNAME]-[LAST4PHONE] or REF-[FIRSTNAME]-[LAST4PHONE]-[N] if disambiguation needed.
 */
export function generateCandidateReferralCode(
  name: string,
  phone: string,
  existingCodes?: string[]
): string {
  const handle = extractCleanFirstName(name);
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const tail = cleanPhone.length >= 4 
    ? cleanPhone.slice(-4) 
    : Math.floor(1000 + Math.random() * 9000).toString();

  const baseCode = `REF-${handle}-${tail}`;

  if (!existingCodes || !existingCodes.includes(baseCode)) {
    return baseCode;
  }

  // Disambiguation for collisions
  let counter = 2;
  while (existingCodes.includes(`${baseCode}-${counter}`)) {
    counter++;
  }
  return `${baseCode}-${counter}`;
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
