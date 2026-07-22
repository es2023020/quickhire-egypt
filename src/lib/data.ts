import type { OfferWithPhone } from "./offers.types";

import offersData from "./offers_data.json";
import applicationsData from "./applications_data.json";

export const BUILT_IN_OFFERS = offersData as OfferWithPhone[];


export type MockApplication = {
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
  cv_data: string | null;          // base64 data URL of the uploaded CV file
  voice_notes: { lang: string; path: string; data?: string }[]; // data = base64 data URL
  transcripts: Record<string, string>;
  english_score: number | null;
  comm_score: number | null;
  exp_score: number | null;
  total_score: number | null;
  ai_notes: string | null;
  answers: Record<string, string>;
  status: string;
  admin_notes: string | null;
  cv_review_notes?: string | null;
  cv_review_status?: "pending" | "approved" | "rejected" | null;
  scoring_status: string;
  created_at: string;
  updated_at?: string;
};

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

export const MOCK_APPLICATIONS: MockApplication[] = [
  {
    id: "app-001", offer_id: "o1", full_name: "Mohamed Ahmed", email: "m.ahmed@gmail.com", phone: "01012345678",
    age: 26, location: "Cairo – Maadi", grad_status: "Graduate", english_level: "C1 – Advanced",
    experience_years: 3, salary_expectation: "16000",
    cv_path: "cvs/app-001-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-001-en.webm" }],
    transcripts: { English: "Hi, my name is Mohamed Ahmed. I have three years of B2B sales experience with Concentrix and I'm known for strong pipeline management. My biggest win was closing a 400K EGP software contract for a logistics firm. I love the challenge of consultative selling." },
    english_score: 9, comm_score: 9, exp_score: 8, total_score: 26,
    ai_notes: "Strong English delivery, natural pace, confident tone. Good experience narrative. Recommended for shortlist.", answers: { worked_before_at_company: "Yes – full time", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(2),
  },
  {
    id: "app-002", offer_id: "o2", full_name: "Sara Hassan", email: "sara.hassan@hotmail.com", phone: "01098765432",
    age: 24, location: "Cairo – Nasr City", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 2, salary_expectation: "18000",
    cv_path: "cvs/app-002-cv.pdf", cv_data: null, voice_notes: [{ lang: "French", path: "voice-notes/app-002-fr.webm" }],
    transcripts: { French: "Bonjour, je m'appelle Sara Hassan. J'ai deux ans d'expérience en service client en français pour une compagnie d'assurance. Je suis capable de gérer des situations complexes avec calme et professionnalisme." },
    english_score: 8, comm_score: 9, exp_score: 7, total_score: 24,
    ai_notes: "Native-level French accent, excellent vocabulary, empathetic tone. Solid customer service background.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "I'm in my notice period", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(3),
  },
  {
    id: "app-003", offer_id: "o1", full_name: "Omar Ibrahim", email: "omar.ibr@yahoo.com", phone: "01155544433",
    age: 28, location: "Cairo – Heliopolis", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 2, salary_expectation: "15000",
    cv_path: "cvs/app-003-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-003-en.webm" }],
    transcripts: { English: "Hello, I am Omar Ibrahim. I have been in sales for two years, mostly in the financial services sector. I believe I have the right attitude and skills to succeed at Concentrix." },
    english_score: 7, comm_score: 8, exp_score: 7, total_score: 22,
    ai_notes: "Clear English with slight accent. Good communication skills. Average experience level. Consider for interview.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(4),
  },
  {
    id: "app-004", offer_id: "o3", full_name: "Nadia Khaled", email: "nadia.k@gmail.com", phone: "01201234567",
    age: 32, location: "Giza – Mohandeseen", grad_status: "Post-graduate", english_level: "C1 – Advanced",
    experience_years: 6, salary_expectation: "26000",
    cv_path: "cvs/app-004-cv.pdf", cv_data: null, voice_notes: [{ lang: "Arabic", path: "voice-notes/app-004-ar.webm" }],
    transcripts: { Arabic: "أنا ناديا خالد ولدي خمس سنوات خبرة في مبيعات الاتصالات منها سنتين كقائدة فريق. نجحت في رفع أداء فريقي بنسبة ٤٠٪ في عام واحد من خلال برامج تدريبية مخصصة." },
    english_score: 9, comm_score: 10, exp_score: 9, total_score: 28,
    ai_notes: "Outstanding Arabic delivery. Exceptional team leadership experience. Strong metrics-driven track record. Top candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "I'm in my notice period", contacted_hr_before: "Yes – they reached out to me" },
    status: "hired", admin_notes: "Excellent candidate. Signed offer 5 July 2026.", scoring_status: "done", created_at: daysAgo(10),
  },
  {
    id: "app-005", offer_id: "o4", full_name: "Youssef Ali", email: "youssef.ali@gmail.com", phone: "01067891234",
    age: 22, location: "Cairo – Downtown", grad_status: "Currently enrolled", english_level: "B2 – Upper Intermediate",
    experience_years: 0, salary_expectation: "12000",
    cv_path: "cvs/app-005-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-005-en.webm" }],
    transcripts: { English: "Hi, I am Youssef, a final-year business student. I do not have formal work experience but I have run the sales committee for my university and I understand prospecting through my own freelance work." },
    english_score: 7, comm_score: 6, exp_score: 6, total_score: 19,
    ai_notes: "Enthusiastic delivery. Limited experience but shows initiative. English is solid with room to improve. Good entry-level potential.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(1),
  },
  {
    id: "app-006", offer_id: "o6", full_name: "Mariam Tawfik", email: "mariam.tawfik@gmail.com", phone: "01187654321",
    age: 27, location: "Cairo – Heliopolis", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 3, salary_expectation: "20000",
    cv_path: "cvs/app-006-cv.pdf", cv_data: null, voice_notes: [{ lang: "German", path: "voice-notes/app-006-de.webm" }],
    transcripts: { German: "Guten Tag, ich heiße Mariam Tawfik. Ich habe drei Jahre Erfahrung im deutschen Kundendienst für einen österreichischen Online-Händler. Ich bin sehr kommunikativ und löse Probleme gerne effizient." },
    english_score: 8, comm_score: 9, exp_score: 8, total_score: 25,
    ai_notes: "Very good German fluency, clear articulation. Strong customer service background. Recommended shortlist.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(5),
  },
  {
    id: "app-007", offer_id: "o7", full_name: "Karim Mostafa", email: "karim.m@outlook.com", phone: "01234567890",
    age: 23, location: "Cairo – New Cairo", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 1, salary_expectation: "13000",
    cv_path: "cvs/app-007-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-007-en.webm" }],
    transcripts: { English: "Hello, I am Karim. I spent one year in a B2B software sales role and learned to prospect on LinkedIn and via cold email. I am excited about the opportunity at Amazon." },
    english_score: 6, comm_score: 6, exp_score: 5, total_score: 17,
    ai_notes: "Average English fluency. Some hesitation in delivery. Limited prospecting experience. Borderline for interview.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(2),
  },
  {
    id: "app-008", offer_id: "o1", full_name: "Randa Adel", email: "randa.adel@gmail.com", phone: "01011223344",
    age: 25, location: "Cairo – Zamalek", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 2, salary_expectation: "15000",
    cv_path: "cvs/app-008-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-008-en.webm" }],
    transcripts: { English: "Hi, my name is Randa Adel. I have two years of inbound sales experience, primarily in e-commerce. I am known for high conversion rates on inbound calls and I adapt quickly to new products." },
    english_score: 7, comm_score: 8, exp_score: 6, total_score: 21,
    ai_notes: "Good English fluency, warm tone. Relevant inbound experience. Slightly weak on complex objection handling in the note.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "I was recently made redundant", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(1),
  },
  {
    id: "app-009", offer_id: "o2", full_name: "Hassan Farouk", email: "hassan.farouk@gmail.com", phone: "01556677889",
    age: 29, location: "Cairo – Nasr City", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 5, salary_expectation: "19000",
    cv_path: "cvs/app-009-cv.pdf", cv_data: null, voice_notes: [{ lang: "French", path: "voice-notes/app-009-fr.webm" }, { lang: "English", path: "voice-notes/app-009-en.webm" }],
    transcripts: {
      French: "Bonjour. Hassan Farouk à l'appareil. J'ai cinq ans d'expérience dans un centre d'appels francophone et j'ai été nommé meilleur agent de l'année deux fois. Je suis passionné par la satisfaction client.",
      English: "In English, I have worked for five years in French-language customer support and I am comfortable handling escalations and quality monitoring.",
    },
    english_score: 10, comm_score: 10, exp_score: 9, total_score: 29,
    ai_notes: "Near-native French. Outstanding communication scores. Top 1% of candidates reviewed. Immediate hire recommended.", answers: { worked_before_at_company: "Yes – full time", has_contract_or_resigned: "I'm in my notice period", contacted_hr_before: "Yes – they reached out to me" },
    status: "hired", admin_notes: "Star candidate. Hired. Start date 15 July.", scoring_status: "done", created_at: daysAgo(12),
  },
  {
    id: "app-010", offer_id: "o8", full_name: "Dina Walid", email: "dina.w@gmail.com", phone: "01099887766",
    age: 30, location: "New Cairo – 5th Settlement", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 4, salary_expectation: "14000",
    cv_path: "cvs/app-010-cv.pdf", cv_data: null, voice_notes: [{ lang: "Arabic", path: "voice-notes/app-010-ar.webm" }],
    transcripts: { Arabic: "مرحباً أنا دينا وليد. عملت في مبيعات العقارات السكنية لمدة ٤ سنوات في المتحدة للتطوير. أتميز ببناء علاقات طويلة مع العملاء وإتمام الصفقات بنسبة إغلاق ٣٥٪." },
    english_score: 8, comm_score: 8, exp_score: 7, total_score: 23,
    ai_notes: "Clear Arabic, good pace. Solid property sales background with strong closing record. Worth interviewing.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(6),
  },
  {
    id: "app-011", offer_id: "o4", full_name: "Amr Talaat", email: "amr.talaat@gmail.com", phone: "01144332211",
    age: 24, location: "Cairo – Shubra", grad_status: "Graduate", english_level: "B1 – Intermediate",
    experience_years: 1, salary_expectation: "11000",
    cv_path: "cvs/app-011-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-011-en.webm" }],
    transcripts: { English: "Hello my name is Amr. I have one year experience in... uh... customer service. I want to work in sales because I think it is a good career. I am willing to learn." },
    english_score: 5, comm_score: 5, exp_score: 5, total_score: 15,
    ai_notes: "Hesitant delivery, multiple pauses. English B1 level insufficient for SDR role requiring C1 written outreach. Not recommended.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "rejected", admin_notes: "English level below requirement.", scoring_status: "done", created_at: daysAgo(8),
  },
  {
    id: "app-012", offer_id: "o3", full_name: "Heba Saad", email: "heba.saad@gmail.com", phone: "01266554433",
    age: 35, location: "Giza – 6th of October", grad_status: "Graduate", english_level: "C1 – Advanced",
    experience_years: 8, salary_expectation: "27000",
    cv_path: "cvs/app-012-cv.pdf", cv_data: null, voice_notes: [{ lang: "Arabic", path: "voice-notes/app-012-ar.webm" }],
    transcripts: { Arabic: "أنا هبة سعد ولدي ٨ سنوات خبرة في قطاع الاتصالات. شغلت منصب تيم ليدر لمدة ٣ سنوات وحققت أعلى معدل رضا عملاء في قسمنا لعامين متتاليين." },
    english_score: 9, comm_score: 9, exp_score: 9, total_score: 27,
    ai_notes: "Commanding presence, excellent structure. 8 years Vodafone-sector experience. Strong team leadership metrics. Top hire.", answers: { worked_before_at_company: "Yes – full time", has_contract_or_resigned: "I'm in my notice period", contacted_hr_before: "Yes – they reached out to me" },
    status: "hired", admin_notes: "Hired as Senior Team Lead. Start 1 Aug.", scoring_status: "done", created_at: daysAgo(14),
  },
  {
    id: "app-013", offer_id: "o1", full_name: "Sherif Mansour", email: "sherif.m@gmail.com", phone: "01022334455",
    age: 27, location: "Cairo – Dokki", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 3, salary_expectation: "14000",
    cv_path: "cvs/app-013-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-013-en.webm" }],
    transcripts: { English: "My name is Sherif Mansour. I have three years in financial products telesales. I am a consistent quota attainer and I focus on quality conversations rather than just volume." },
    english_score: 7, comm_score: 7, exp_score: 6, total_score: 20,
    ai_notes: "Steady English delivery. Relevant telesales background. Quota mention is positive. Mid-tier candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(3),
  },
  {
    id: "app-014", offer_id: "o9", full_name: "Noha Ragab", email: "noha.ragab@gmail.com", phone: "01377665544",
    age: 21, location: "Alexandria – Sidi Gaber", grad_status: "Currently enrolled", english_level: "B1 – Intermediate",
    experience_years: 0, salary_expectation: "9000",
    cv_path: "cvs/app-014-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-014-en.webm" }],
    transcripts: { English: "Hello, I am Noha from Alexandria. I am a second year student. I think this role suits me because I am a very patient and helpful person and I like talking to people." },
    english_score: 6, comm_score: 6, exp_score: 6, total_score: 18,
    ai_notes: "Friendly tone. English sufficient for B1 role. No experience but attitude is positive. Entry-level appropriate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(1),
  },
  {
    id: "app-015", offer_id: "o5", full_name: "Tarek Fouad", email: "tarek.fouad@gmail.com", phone: "01488776655",
    age: 34, location: "Cairo – Mohandeseen", grad_status: "Post-graduate", english_level: "C1 – Advanced",
    experience_years: 7, salary_expectation: "24000",
    cv_path: "cvs/app-015-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-015-en.webm" }],
    transcripts: { English: "I am Tarek Fouad, seven years in enterprise IT solutions sales. My largest single deal was 1.2 million EGP with a Cairo hospital group. I manage relationships at C-suite level and understand complex procurement cycles." },
    english_score: 9, comm_score: 8, exp_score: 7, total_score: 24,
    ai_notes: "Polished English, strong enterprise background. Deal size relevant. Confident at executive level. Strong shortlist candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "I'm in my notice period", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(7),
  },
  {
    id: "app-016", offer_id: "o2", full_name: "Iman Gamal", email: "iman.gamal@gmail.com", phone: "01599887766",
    age: 26, location: "Cairo – Madinaty", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 2, salary_expectation: "17000",
    cv_path: "cvs/app-016-cv.pdf", cv_data: null, voice_notes: [{ lang: "French", path: "voice-notes/app-016-fr.webm" }],
    transcripts: { French: "Bonjour je suis Iman Gamal. J'ai travaillé dans un call center pendant deux ans pour un client français spécialisé dans l'énergie. Je maîtrise les outils CRM et j'ai de bonnes compétences d'écoute." },
    english_score: 7, comm_score: 8, exp_score: 7, total_score: 22,
    ai_notes: "Good French, slight Egyptian accent audible but not distracting. Solid CS background. Interview-worthy.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(2),
  },
  {
    id: "app-017", offer_id: "o10", full_name: "Mahmoud Ashraf", email: "m.ashraf@gmail.com", phone: "01611223344",
    age: 28, location: "Cairo – Zamalek", grad_status: "Graduate", english_level: "C1 – Advanced",
    experience_years: 4, salary_expectation: "19000",
    cv_path: "cvs/app-017-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-017-en.webm" }],
    transcripts: { English: "Hi, I am Mahmoud Ashraf. I have spent four years in SaaS sales, the last two at an HR-tech company. I know how to demo, I know how to discover pain, and I know how to close SME decision makers." },
    english_score: 9, comm_score: 9, exp_score: 8, total_score: 26,
    ai_notes: "Excellent SaaS vocabulary and confident delivery. Direct HR-tech experience highly relevant. Prioritise for interview.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(4),
  },
  {
    id: "app-018", offer_id: "o8", full_name: "Yasmin Samir", email: "yasmin.s@gmail.com", phone: "01722334455",
    age: 27, location: "New Cairo – 5th Settlement", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 2, salary_expectation: "13000",
    cv_path: "cvs/app-018-cv.pdf", cv_data: null, voice_notes: [{ lang: "Arabic", path: "voice-notes/app-018-ar.webm" }],
    transcripts: { Arabic: "أنا ياسمين سمير ولدي سنتان في مجال المبيعات العقارية. أعمل بشكل جيد مع العملاء ذوي الميزانيات الكبيرة وأقدر على شرح خطط السداد بطريقة واضحة." },
    english_score: 7, comm_score: 7, exp_score: 7, total_score: 21,
    ai_notes: "Clear Arabic, calm tone. Relevant property experience. Communicates payment plans confidently. Mid-tier candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(5),
  },
  {
    id: "app-019", offer_id: "o7", full_name: "Bassem Abdel", email: "bassem.a@gmail.com", phone: "01833445566",
    age: 23, location: "Cairo – Ain Shams", grad_status: "Graduate", english_level: "B1 – Intermediate",
    experience_years: 0, salary_expectation: "10000",
    cv_path: "cvs/app-019-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-019-en.webm" }],
    transcripts: { English: "Hello I am Bassem. I graduated six months ago. I want to work at Amazon because it is a big company. I am a hard worker and I will learn fast." },
    english_score: 4, comm_score: 5, exp_score: 4, total_score: 13,
    ai_notes: "Very limited English for a role requiring high-volume cold outreach. Weak pitch structure. Not recommended at this time.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "rejected", admin_notes: "English too weak for BDR cold outreach.", scoring_status: "done", created_at: daysAgo(9),
  },
  {
    id: "app-020", offer_id: "o1", full_name: "Nora Shafik", email: "nora.shafik@gmail.com", phone: "01944556677",
    age: 29, location: "Cairo – Maadi", grad_status: "Graduate", english_level: "C1 – Advanced",
    experience_years: 4, salary_expectation: "17000",
    cv_path: "cvs/app-020-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-020-en.webm" }],
    transcripts: { English: "Good morning. I am Nora Shafik. Over four years I have sold enterprise software and managed a book of business worth over 2 million EGP annually. I have a coaching mindset and I mentor two junior reps in my current role." },
    english_score: 9, comm_score: 8, exp_score: 8, total_score: 25,
    ai_notes: "Professional and structured. Strong revenue context. Mentoring experience suggests leadership upside. Excellent shortlist candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "I'm in my notice period", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(6),
  },
  {
    id: "app-021", offer_id: "o4", full_name: "Ahmed Sayed", email: "ahmed.sayed@gmail.com", phone: "01055667788",
    age: 23, location: "Cairo – Downtown", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 1, salary_expectation: "12000",
    cv_path: "cvs/app-021-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-021-en.webm" }],
    transcripts: { English: "Hi I am Ahmed Sayed. I spent the last year doing outbound sales for a digital marketing agency. I reached decision makers via LinkedIn and cold calls. I understand the prospecting funnel." },
    english_score: 8, comm_score: 7, exp_score: 8, total_score: 23,
    ai_notes: "Competent English, relevant prospecting experience. Shows understanding of outbound process. Solid junior SDR candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(2),
  },
  {
    id: "app-022", offer_id: "o6", full_name: "Laila Ramzy", email: "laila.ramzy@gmail.com", phone: "01166778899",
    age: 31, location: "Cairo – Heliopolis", grad_status: "Post-graduate", english_level: "C2 – Proficient / Native",
    experience_years: 5, salary_expectation: "21000",
    cv_path: "cvs/app-022-cv.pdf", cv_data: null, voice_notes: [{ lang: "German", path: "voice-notes/app-022-de.webm" }],
    transcripts: { German: "Guten Morgen. Ich bin Laila Ramzy und habe fünf Jahre Erfahrung im deutschsprachigen Kundendienst für einen Schweizer Retailer. Ich bin bekannt für meine Fähigkeit, schwierige Situationen ruhig und lösungsorientiert zu handhaben." },
    english_score: 9, comm_score: 9, exp_score: 9, total_score: 27,
    ai_notes: "Outstanding German — near-native Swiss-influenced accent. Excellent de-escalation language. Top candidate for Majorel. Shortlist immediately.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "shortlisted", admin_notes: null, scoring_status: "done", created_at: daysAgo(8),
  },
  {
    id: "app-023", offer_id: "o10", full_name: "Ibrahim Hany", email: "ibrahim.hany@gmail.com", phone: "01277889900",
    age: 26, location: "Cairo – Mohandeseen", grad_status: "Graduate", english_level: "B2 – Upper Intermediate",
    experience_years: 2, salary_expectation: "15000",
    cv_path: "cvs/app-023-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-023-en.webm" }],
    transcripts: { English: "Hi I am Ibrahim Hany. I worked two years selling ERP software to SMEs. I know how to run a product demo and I am comfortable working a longer sales cycle with multiple stakeholders." },
    english_score: 7, comm_score: 6, exp_score: 6, total_score: 19,
    ai_notes: "Adequate English. ERP experience is relevant to SaaS but lacks HR-tech specifically. Average delivery. Consider for interview.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(3),
  },
  {
    id: "app-024", offer_id: "o9", full_name: "Mona Adly", email: "mona.adly@gmail.com", phone: "01388990011",
    age: 20, location: "Alexandria – Borg El Arab", grad_status: "Currently enrolled", english_level: "B1 – Intermediate",
    experience_years: 0, salary_expectation: "9000",
    cv_path: "cvs/app-024-cv.pdf", cv_data: null, voice_notes: [{ lang: "English", path: "voice-notes/app-024-en.webm" }],
    transcripts: { English: "Hi my name is Mona. I am a student in English department. I practice English every day and I like to help people. I think I can do this job very good." },
    english_score: 5, comm_score: 6, exp_score: 5, total_score: 16,
    ai_notes: "Warm personality but English still developing. Grammar errors in call simulation. Below threshold for this role currently.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "rejected", admin_notes: "English below B2 threshold.", scoring_status: "done", created_at: daysAgo(11),
  },
  {
    id: "app-025", offer_id: "o3", full_name: "Sameh Khalil", email: "sameh.k@gmail.com", phone: "01499001122",
    age: 33, location: "Giza – Dokki", grad_status: "Graduate", english_level: "C1 – Advanced",
    experience_years: 5, salary_expectation: "22000",
    cv_path: "cvs/app-025-cv.pdf", cv_data: null, voice_notes: [{ lang: "Arabic", path: "voice-notes/app-025-ar.webm" }],
    transcripts: { Arabic: "أنا سامح خليل. عملت ٥ سنوات في مبيعات التليفون في إيتيدا وأوراسكوم. أجيد إدارة الفرق الصغيرة وأحقق أهدافي باستمرار. أبحث عن فرصة أكبر مع شركة بحجم فودافون." },
    english_score: 8, comm_score: 7, exp_score: 7, total_score: 22,
    ai_notes: "Confident Arabic. Solid telecom background. Leadership interest noted but experience is team member not lead. Good candidate.", answers: { worked_before_at_company: "No", has_contract_or_resigned: "No – I'm currently free to join", contacted_hr_before: "No" },
    status: "new", admin_notes: null, scoring_status: "done", created_at: daysAgo(1),
  },
];

export const STUDY_RESOURCES = [
  {
    id: "sr-001", category: "English Fluency", sort_order: 1,
    title: "The 60-Second Self-Introduction",
    description: "A proven script to introduce yourself on any call — clear, confident, memorable.",
    url: null,
    content: `Structure:\n1. Name + Current/last role (10 sec)\n2. Years of experience + industry (10 sec)\n3. One specific achievement with a number (15 sec)\n4. Why this role excites you (10 sec)\n5. Strong close: "I'm keen to tell you more" (5 sec)\n\nExample:\n"My name is Sara Hassan. I am currently a customer service agent at Teleperformance, where I have been for two years handling French-speaking clients in the energy sector.\n\nIn my last quarter I hit 97% customer satisfaction — the highest in my team.\n\nI am applying because I want to grow into a senior role in a company that invests in its people, and from everything I've heard, that is exactly what you do.\n\nI would love the chance to tell you more about what I can bring to the team."\n\nPractise this until it takes exactly 55–65 seconds. Record yourself.`,
  },
  {
    id: "sr-002", category: "English Fluency", sort_order: 2,
    title: "Common Call-Centre English Phrases",
    description: "The exact phrases that impress supervisors and satisfy customers.",
    url: null,
    content: `Opening a call:\n• "Thank you for calling [Company], my name is [Name]. How may I assist you today?"\n• "Good [morning/afternoon], you're through to [Name] at [Company]. What can I do for you?"\n\nWhen you need to check something:\n• "I completely understand. Just give me a moment to pull up your account."\n• "Bear with me one second while I look into that for you."\n\nHandling an upset customer:\n• "I sincerely apologise for the inconvenience this has caused."\n• "I completely understand your frustration and I'm going to do everything I can to resolve this today."\n\nClosing:\n• "Is there anything else I can help you with today?"\n• "Thank you for your patience. Have a great rest of your day."\n\nNEVER say:\n• "No problem" (say "Of course" or "Certainly")\n• "I don't know" (say "Let me find out for you")\n• "That's not my department" (say "Let me connect you with the right team")`,
  },
  {
    id: "sr-003", category: "English Fluency", sort_order: 3,
    title: "Pronunciation Quick-Fixes for Arabic Speakers",
    description: "The 8 sounds that trip up Egyptian English speakers — with drills.",
    url: null,
    content: `1. P vs B: "please" not "blease", "price" not "brice"\n   Drill: "Peter pays a pretty price for paper."\n\n2. V vs F/W: "very" not "wery", "value" not "falue"\n   Drill: "The value of every service varies."\n\n3. TH (ث): "this", "that", "thank" — tongue between teeth\n   Drill: "Thank you for thinking about that thoroughly."\n\n4. Short vowels: "ship" vs "sheep", "bit" vs "beat"\n   Drill: "I sit in the seat. I live to leave."\n\n5. Final consonants: "card", "call", "cost" — always pronounce them\n\n6. Word stress: "proFESsional" not "PROfessional"\n   Drill: "I am a proFESsional in inTERnational reLAtions."\n\nPractice daily for 5 minutes. Record yourself and listen back.`,
  },
  {
    id: "sr-004", category: "Interview Preparation", sort_order: 1,
    title: "The STAR Method — Answer Any Behavioural Question",
    description: "One framework to ace 90% of interview questions.",
    url: null,
    content: `STAR = Situation · Task · Action · Result\n\nEvery "Tell me about a time when..." question needs a STAR answer.\n\nExample question: "Tell me about a time you dealt with a difficult customer."\n\nSituation (30 sec): "I was working a night shift at the call centre and received a call from a customer who had been double-charged for three months."\n\nTask (10 sec): "I needed to resolve the billing issue and rebuild trust with an angry customer."\n\nAction (60 sec): "I first acknowledged his frustration and apologised sincerely. I then escalated to billing while keeping him on hold — no more than 4 minutes. I got the three months refunded to his account and offered a 15% discount on his next month as a goodwill gesture."\n\nResult (20 sec): "He left the call satisfied and gave us a 5-star rating on the post-call survey. He also renewed his subscription the following month."\n\nCommon questions to prepare STAR answers for:\n• Difficult customer\n• Time you failed / made a mistake\n• Time you exceeded a target\n• Conflict with a colleague\n• Example of going above and beyond`,
  },
  {
    id: "sr-005", category: "Interview Preparation", sort_order: 2,
    title: "Sales Interview: Questions & Killer Answers",
    description: "The 10 most common sales interview questions with strong example answers.",
    url: null,
    content: `Q1: "How do you handle rejection?"\nA: "I treat every 'no' as data. If 10 people say the same objection, I update my pitch. Rejection is just part of the pipeline math — I stay focused on my daily activity targets, not the outcome of any single call."\n\nQ2: "What is your sales process?"\nA: "I use a discovery-first approach. I spend the first call understanding the problem before I mention the solution. Then I tailor the demo to their specific pain. Close rates improve significantly when the customer feels understood."\n\nQ3: "Tell me about your biggest deal."\nA: [Use STAR method — always include the EGP value.]\n\nQ4: "Why do you want to work in sales?"\nA: "I thrive in a merit-based environment where my efforts directly reflect in my earnings. I enjoy problem-solving and building relationships. Sales is where skill and hard work compound fastest."\n\nQ5: "How do you manage your pipeline?"\nA: "I update my CRM after every interaction, same day. I do a weekly review of every stage — anything that hasn't moved in 10 days gets a follow-up or a decision to disqualify. Clean pipeline = accurate forecast."`,
  },
  {
    id: "sr-006", category: "Interview Preparation", sort_order: 3,
    title: "Questions to Ask Your Interviewer",
    description: "End every interview strongly — these questions show you are serious.",
    url: null,
    content: `Always ask at least 2 questions at the end. These work in any role:\n\n1. "What does success look like in the first 90 days for someone in this role?"\n   Why it works: Shows you are results-focused and planning ahead.\n\n2. "What do top performers in this team do differently from average performers?"\n   Why it works: Shows you want to excel, not just pass.\n\n3. "What are the biggest challenges someone joining this team typically faces in the first month?"\n   Why it works: Shows maturity and preparation.\n\n4. "What are the career progression opportunities from this role?"\n   Why it works: Shows ambition.\n\n5. "What do you enjoy most about working here?"\n   Why it works: Creates human connection and gets authentic information.\n\nNEVER ask: "What is the salary?" (on first interview), "How many hours do I work?", "What are the sick day policies?"`,
  },
  {
    id: "sr-007", category: "Call Centre Mastery", sort_order: 1,
    title: "Average Handle Time (AHT) — How to Hit Your Targets",
    description: "Practical techniques to reduce call length without sacrificing satisfaction.",
    url: null,
    content: `AHT = Talk Time + Hold Time + After-Call Work\n\nTo reduce Talk Time:\n• Use the customer's name 2–3 times — builds rapport faster\n• Mirror their pace: slow customers need patience, fast customers need efficiency\n• "Let me check that for you right now" signals progress and prevents silence\n\nTo reduce Hold Time:\n• Know your top 20 most common query types by heart — no need to look them up\n• Pre-type the resolution while the customer is still explaining\n• Use warm transfer, never blind: "I'll connect you with Sarah in billing — she knows your case."\n\nTo reduce After-Call Work:\n• Develop keyboard shortcuts for your 5 most common notes\n• Use a consistent note template: Date / Issue / Action Taken / Resolution\n• Log the note type before the call ends if your system allows it\n\nBenchmarks:\n• Good AHT: 4–6 minutes\n• Great AHT: 3–4 minutes\n• Never rush a customer who is upset — quality trumps speed on CSAT metrics`,
  },
  {
    id: "sr-008", category: "Call Centre Mastery", sort_order: 2,
    title: "Handling Angry Customers — The 5-Step De-escalation Script",
    description: "A word-for-word process that turns furious callers into satisfied ones.",
    url: null,
    content: `Step 1 — Let them vent (do NOT interrupt)\nSay nothing. Listen fully. The customer needs to feel heard before they will accept help. This takes 30–60 seconds. Use verbal nods: "I see... yes... I understand..."\n\nStep 2 — Acknowledge and validate\n"I completely understand why you're frustrated — three weeks is far too long for this to be unresolved, and I sincerely apologise."\nDO NOT say "I'm sorry you feel that way" — it sounds dismissive.\n\nStep 3 — Take ownership\n"I am going to personally make sure we resolve this today."\nUse "I" not "we" or "the team" — personal accountability calms people.\n\nStep 4 — Explain what you will do (present tense)\n"What I am doing right now is raising a priority ticket. You will receive a confirmation SMS within 10 minutes."\n\nStep 5 — Confirm resolution and close warmly\n"Is that everything sorted for you today? ... Thank you so much for your patience — I know that was not the experience you deserved."`,
  },
];
