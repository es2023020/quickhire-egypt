export type Offer = {
  id: string;
  slug: string;
  title: string;
  company: string;
  category: string;
  language: string | null;
  salary_text: string;
  salary_min: number | null;
  location: string;
  shift_type: string | null;
  summary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  form_schema: {
    voice_notes?: { lang: string; prompt: string }[];
  };
  status: string;
  featured: boolean;
  created_at: string;
};

export type OfferWithPhone = Offer & { hr_phone: string | null };

export type Application = {
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
  answers: Record<string, unknown>;
  cv_path: string | null;
  voice_notes: { lang: string; path: string }[];
  transcripts: Record<string, string>;
  english_score: number | null;
  comm_score: number | null;
  exp_score: number | null;
  total_score: number | null;
  ai_notes: string | null;
  status: string;
  admin_notes: string | null;
  scoring_status: string;
  created_at: string;
};
