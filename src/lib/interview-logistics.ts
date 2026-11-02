/**
 * Interview Logistics & WhatsApp Automation Engine (The "No-Show Killer")
 * Tailored specifically for Egyptian & MENA BPO & Call Center mass recruitment.
 */

export type BpoSitePreset = {
  id: string;
  name: string;
  shortName: string;
  area: string;
  address: string;
  mapsUrl: string;
  recommendedBusHubs: string[];
  gateSecurityNote: string;
};

export const BPO_SITE_PRESETS: BpoSitePreset[] = [
  {
    id: "smart-village",
    name: "Smart Village — KM 28 Cairo-Alex Desert Road",
    shortName: "Smart Village (B12 / Telecom Hub)",
    area: "Giza / 6th of October",
    address: "Smart Village, KM 28 Cairo-Alexandria Desert Road, Giza (Gate 1 / Building B12)",
    mapsUrl: "https://maps.app.goo.gl/KYyUoBtBshB8mnro7",
    recommendedBusHubs: [
      "Ramses Station (In front of Railway Gate)",
      "Giza Metro (Opposite Cairo University)",
      "HyperOne Sheikh Zayed (Main Bus Bay)",
      "Abbassiya (Opposite Misr Travel Tower)",
      "Direct Arrival (On-site entry via Gate 1)",
    ],
    gateSecurityNote: "National ID is mandatory for security gate entry. State you have an interview assessment.",
  },
  {
    id: "maadi-tech-park",
    name: "Maadi Technology Park (MTP) — New Maadi",
    shortName: "Maadi Tech Park (Building 1B / 3A)",
    area: "Cairo — Maadi",
    address: "Maadi Technological Park, Wireless St, New Maadi, Cairo (Near Vodafone & Sutherland buildings)",
    mapsUrl: "https://maps.app.goo.gl/6UoRkTGSfmZXJ76J8",
    recommendedBusHubs: [
      "Maadi Metro Station (El Nasr St Exit — Continuous shuttles every 15 mins)",
      "Helwan Metro Station (Main Bus Stop)",
      "Mounib Metro Station (Ring Road Hub)",
      "Sayeda Zeinab / Ramses (Central Hub)",
      "Direct Arrival (On-site entry)",
    ],
    gateSecurityNote: "Present your National ID and specify QuickHire / Partner Interview at the MTP security turnstiles.",
  },
  {
    id: "new-cairo-plaza",
    name: "New Cairo — 5th Settlement (Plaza & North 90th)",
    shortName: "New Cairo Plaza (5th Settlement)",
    area: "Cairo — New Cairo",
    address: "New Cairo Plaza, North 90th Street / North Investors Area, 5th Settlement, Cairo",
    mapsUrl: "https://maps.app.goo.gl/2XiXup2",
    recommendedBusHubs: [
      "Abbassiya (Nour Mosque Meeting Bay)",
      "Nasr City (Rabaa Square / Al-Ahly Club)",
      "El Marg / Gesr El Suez (Metro Interchange)",
      "Mounib Ring Road Station",
      "Direct Arrival (On-site entry)",
    ],
    gateSecurityNote: "Present your National ID card at the building reception desk.",
  },
  {
    id: "october-horizon",
    name: "6th of October — Industrial & Horizon Park",
    shortName: "6th of October (Horizon Complex)",
    area: "Giza — 6th of October",
    address: "Horizon Business Park, Near Juhayna Square & Mall of Arabia, 6th of October City",
    mapsUrl: "https://maps.google.com/?q=Mall+of+Arabia+6th+of+October",
    recommendedBusHubs: [
      "Hosary Square (Behind Hosary Mosque)",
      "HyperOne Sheikh Zayed",
      "Lebneen Square / Mohandeseen",
      "Direct Arrival (On-site entry)",
    ],
    gateSecurityNote: "Security badge required. Bring your original National ID card.",
  },
  {
    id: "mohandeseen-center",
    name: "Mohandeseen Assessment Center — Shehab St",
    shortName: "Mohandeseen TA Center",
    area: "Giza — Mohandeseen",
    address: "Shehab Street (off Gameat El Dowal), Mohandeseen, Giza — 3rd Floor Assessment Suite",
    mapsUrl: "https://maps.google.com/?q=Shehab+Street+Mohandeseen",
    recommendedBusHubs: [
      "Bohouth Metro Station (5 min walk / microbus)",
      "Kit Kat Metro Station",
      "Lebneen Square",
      "Direct Arrival (On-site entry)",
    ],
    gateSecurityNote: "Ring buzzer for 3rd Floor QuickHire / TA Suite.",
  },
  {
    id: "alexandria-smouha",
    name: "Alexandria Tech Hub — Sidi Gaber / Smouha",
    shortName: "Alexandria Sidi Gaber Hub",
    area: "Alexandria",
    address: "Sidi Gaber Technology Center (near Sidi Gaber Railway Station & Green Plaza), Smouha, Alexandria",
    mapsUrl: "https://maps.google.com/?q=Sidi+Gaber+Railway+Station+Alexandria",
    recommendedBusHubs: [
      "Sidi Gaber Station (Train & Tram Hub)",
      "Victoria Square",
      "Mansheya Central Station",
      "Direct Arrival (On-site entry)",
    ],
    gateSecurityNote: "National ID check at entrance. Elevator to 2nd Floor Recruitment Center.",
  },
  {
    id: "online-teams",
    name: "Virtual Assessment Room (Microsoft Teams / Zoom)",
    shortName: "Online Virtual Room",
    area: "Remote / Online",
    address: "Online Video Meeting — Link provided upon attendance confirmation",
    mapsUrl: "https://teams.microsoft.com",
    recommendedBusHubs: ["Online (Stable Internet & Laptop/Mobile required)"],
    gateSecurityNote: "Join 5 minutes early with camera on, quiet environment, and headset plugged in.",
  },
];

export const BUS_MEETING_POINTS = [
  "Ramses Station (محطة مصر - رمسيس)",
  "Giza Metro (مترو جامعة الجيزة)",
  "Maadi Metro - El Nasr St (مترو المعادي - شارع النصر)",
  "Helwan Metro (مترو حلوان)",
  "Abbassiya - Misr Travel (العباسية - أمام برج مصر للسياحة)",
  "Nasr City - Rabaa / Al-Ahly Club (مدينة نصر - رابعة / الأهلي)",
  "HyperOne Sheikh Zayed (الشيخ زايد - هايبر وان)",
  "El Marg / Gesr El Suez (المرج / جسر السويس)",
  "Mounib Ring Road (موقف المنيب الدائري)",
  "Hosary Square - 6th of October (ميدان الحصري - ٦ أكتوبر)",
  "Lebneen Square - Mohandeseen (ميدان لبنان - المهندسين)",
  "Alexandria - Sidi Gaber Station (الإسكندرية - سيدي جابر)",
  "Direct Arrival (الحضور مباشرة للمقر)",
  "Online Interview (مقابلة أونلاين)",
];

export const TIME_SLOTS = [
  "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM",
  "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
];

export const DRESS_CODES = [
  "Smart Casual (Shirt/Blouse & Trousers — No shorts, slippers, or athletic wear)",
  "Business Formal (Suit / Blazer)",
  "Casual (Neat and presentable)",
];

export const DEFAULT_CHECKLIST = [
  "Original Valid National ID Card (أصل بطاقة الرقم القومي السارية)",
  "2 Printed Hardcopy CVs (نسختين مطبوعتين من السي في)",
  "Military Service Status Document (for males) (أصل شهادة الموقف من التجنيد للذكور)",
  "Graduation Certificate or Enrollment Proof (أصل المؤهل الدراسي أو إثبات قيد للطلبة)",
  "Blue/Black Pen (قلم جاف لكتابة استمارة التقديم)",
];

export type InterviewLogisticsInput = {
  candidateName: string;
  candidatePhone: string;
  roleTitle: string;
  companyName: string;
  interviewDate: string; // e.g. "Tomorrow, Thursday 16 Oct" or "2026-10-16"
  interviewTime: string; // e.g. "11:30 AM"
  siteName: string;
  siteAddress: string;
  mapsUrl: string;
  busMeetingPoint?: string;
  busDepartureTime?: string;
  dressCode?: string;
  documents?: string[];
  hrCoordinatorPhone?: string;
};

/**
 * 1. The Definitive "No-Show Killer" Interview Invitation (Full Logistics)
 */
export function buildFormalInterviewWhatsApp(info: InterviewLogisticsInput): string {
  const docs = info.documents && info.documents.length > 0 ? info.documents : DEFAULT_CHECKLIST;
  const dress = info.dressCode || DRESS_CODES[0];
  const busSection = info.busMeetingPoint && info.busMeetingPoint !== "Direct Arrival (الحضور مباشرة للمقر)" && info.busMeetingPoint !== "Online Interview (مقابلة أونلاين)"
    ? [
        `🚌 *SHUTTLE BUS / TRANSPORTATION:*`,
        `• Gathering Point: *${info.busMeetingPoint}*`,
        info.busDepartureTime ? `• Departure Time: *${info.busDepartureTime} Sharp*` : `• Departure: *40 mins before your interview slot*`,
        `• Free transportation provided directly to site entrance.`,
        ``,
      ]
    : [];

  return [
    `🎉 *INVITATION: On-Site Interview & Assessment — QuickHire*`,
    ``,
    `Dear *${info.candidateName}*,`,
    `Congratulations! Your application and language evaluation for *${info.roleTitle}* have been reviewed, and you have been *SHORTLISTED* for the final interview wave.`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `🗓 *INTERVIEW APPOINTMENT DETAILS*`,
    `━━━━━━━━━━━━━━━━━━`,
    `📅 *Date:* ${info.interviewDate}`,
    `⏰ *Time Slot:* ${info.interviewTime} (Please arrive 15 minutes early)`,
    `🏢 *Location:* ${info.siteName}`,
    `📍 *Address:* ${info.siteAddress}`,
    `🗺 *Google Maps Link:* ${info.mapsUrl}`,
    ``,
    ...busSection,
    `━━━━━━━━━━━━━━━━━━`,
    `📋 *MANDATORY REQUIREMENTS & DOCUMENTS*`,
    `━━━━━━━━━━━━━━━━━━`,
    ...docs.map((d) => `✓ ${d}`),
    `👔 *Dress Code:* ${dress}`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `⚠️ *IMPORTANT: ATTENDANCE CONFIRMATION*`,
    `━━━━━━━━━━━━━━━━━━`,
    `Due to high applicant volume and security gate access passes, slots are reserved on a strict first-confirmed basis.`,
    ``,
    `👉 *PLEASE REPLY TO THIS MESSAGE WITH:*`,
    `*"1" or "CONFIRM"* to lock your name on the security gate list.`,
    ``,
    info.hrCoordinatorPhone ? `📞 Recruitment Coordinator Hotline: ${info.hrCoordinatorPhone}` : ``,
    ``,
    `We wish you the best of luck! 🇪🇬`,
    `*Career Community / QuickHire Talent Team*`,
  ].filter(Boolean).join("\n");
}

/**
 * 2. 24-Hour Reminder Message (The Nudge)
 */
export function build24hReminderWhatsApp(info: Pick<InterviewLogisticsInput, "candidateName" | "roleTitle" | "interviewDate" | "interviewTime" | "siteName" | "mapsUrl" | "busMeetingPoint" | "busDepartureTime">): string {
  const busLine = info.busMeetingPoint && !info.busMeetingPoint.includes("Direct") && !info.busMeetingPoint.includes("Online")
    ? `\n🚌 Shuttle bus departs *${info.busMeetingPoint}* at *${info.busDepartureTime || "scheduled time"}*.`
    : "";

  return [
    `⏰ *INTERVIEW REMINDER FOR TOMORROW — QuickHire*`,
    ``,
    `Hi *${info.candidateName}*,`,
    `This is a quick reminder about your scheduled interview for *${info.roleTitle}* tomorrow:`,
    ``,
    `📅 *Tomorrow:* ${info.interviewDate}`,
    `⏰ *Time:* ${info.interviewTime}`,
    `🏢 *Location:* ${info.siteName}`,
    `📍 *Maps:* ${info.mapsUrl}${busLine}`,
    ``,
    `Remember to bring your *Original National ID card* and *2 printed CV copies*.`,
    ``,
    `👉 *Are you ready? Please reply "CONFIRMED" to re-validate your gate security pass.*`,
    `See you tomorrow! 🚀`,
  ].join("\n");
}

/**
 * 3. 2-Hour Final Check-in & Gate Pass Hotline
 */
export function build2hFinalCheckinWhatsApp(info: Pick<InterviewLogisticsInput, "candidateName" | "interviewTime" | "siteName" | "mapsUrl" | "hrCoordinatorPhone">): string {
  return [
    `🚨 *FINAL CHECK-IN: Interview in 2 Hours!*`,
    ``,
    `Hi *${info.candidateName}*,`,
    `Your interview is coming up at *${info.interviewTime}* at *${info.siteName}*.`,
    ``,
    `📍 *Live Google Maps:* ${info.mapsUrl}`,
    ``,
    `If you have any difficulty finding the building entrance or passing through security, call/WhatsApp our on-site coordinator immediately:`,
    info.hrCoordinatorPhone ? `📞 *${info.hrCoordinatorPhone}*` : `📞 QuickHire TA Desk`,
    ``,
    `Have your National ID ready. Take a deep breath and do your best! 💪`,
  ].filter(Boolean).join("\n");
}

/**
 * 4. Google Maps Pin Link Only
 */
export function buildLocationPinWhatsApp(siteName: string, address: string, mapsUrl: string): string {
  return [
    `📍 *Interview Site Location & Directions*`,
    `🏢 *${siteName}*`,
    `📌 Address: ${address}`,
    `🗺 Click here for Google Maps navigation:`,
    `${mapsUrl}`,
  ].join("\n");
}

/**
 * 5. Professional Reschedule Inquiry
 */
export function buildRescheduleWhatsApp(candidateName: string, roleTitle: string): string {
  return [
    `Hi *${candidateName}*,`,
    `We noticed you haven't confirmed your interview slot for *${roleTitle}*.`,
    ``,
    `We understand that schedules can be tight. Would you like to reschedule for an alternative date or wave this week?`,
    ``,
    `Please reply with your preferred day and time so we can accommodate your schedule.`,
    `Best regards,`,
    `QuickHire Recruitment Team`,
  ].join("\n");
}
