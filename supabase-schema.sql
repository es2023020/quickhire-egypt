-- ====================================================================
-- QUICKHIRE EGYPT — COMPLETE SUPABASE DATABASE SCHEMA
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean Existing Tables if any
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.study_resources CASCADE;

-- 3. Create OFFERS Table
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  company text NOT NULL,
  category text NOT NULL,
  language text,
  salary_text text NOT NULL,
  salary_min int,
  location text NOT NULL,
  shift_type text,
  summary text NOT NULL,
  description text NOT NULL,
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  form_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  hr_phone text,
  status text NOT NULL DEFAULT 'active',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create APPLICATIONS Table (with all logistics, interviews, bounties & AI scoring)
CREATE TABLE public.applications (
  id text PRIMARY KEY,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  age int,
  location text,
  grad_status text,
  english_level text,
  experience_years int,
  salary_expectation text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  cv_path text,
  cv_data text,
  voice_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  transcripts jsonb NOT NULL DEFAULT '{}'::jsonb,
  english_score numeric,
  comm_score numeric,
  exp_score numeric,
  total_score numeric,
  ai_notes text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  cv_review_notes text,
  cv_review_status text,
  scoring_status text NOT NULL DEFAULT 'pending',
  interview_date text,
  interview_time text,
  interview_site text,
  interview_address text,
  interview_maps_link text,
  interview_bus_point text,
  interview_bus_time text,
  interview_notes text,
  interview_attendance text DEFAULT 'pending',
  wave_tag text,
  referred_by text,
  referral_code text,
  outcome_code text,
  outcome_notes text,
  pipeline_stage text DEFAULT 'applied',
  pipeline_history jsonb DEFAULT '[]'::jsonb,
  placement_fee numeric,
  billing_status text,
  bounty_status text DEFAULT 'pending_review',
  bounty_payment_method text,
  bounty_transaction_ref text,
  bounty_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create STUDY RESOURCES Table
CREATE TABLE public.study_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  description text,
  url text,
  content text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes for ultra-fast candidate and phone tracking
CREATE INDEX IF NOT EXISTS idx_applications_phone ON public.applications(phone);
CREATE INDEX IF NOT EXISTS idx_applications_email ON public.applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_ref_code ON public.applications(referral_code);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON public.applications(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_applications_total_score ON public.applications(total_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_offers_slug ON public.offers(slug);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

-- 7. Grant Permissions to anon, authenticated and service_role
GRANT ALL ON public.offers TO anon, authenticated, service_role;
GRANT ALL ON public.applications TO anon, authenticated, service_role;
GRANT ALL ON public.study_resources TO anon, authenticated, service_role;

-- 8. Enable Row Level Security (RLS) with open recruitment access
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_read_public" ON public.offers FOR SELECT USING (true);
CREATE POLICY "offers_admin_all" ON public.offers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "apps_read_public" ON public.applications FOR SELECT USING (true);
CREATE POLICY "apps_insert_public" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "apps_update_all" ON public.applications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "apps_delete_all" ON public.applications FOR DELETE USING (true);

CREATE POLICY "study_read_public" ON public.study_resources FOR SELECT USING (true);
CREATE POLICY "study_admin_all" ON public.study_resources FOR ALL USING (true) WITH CHECK (true);

-- 9. Auto-updated timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
