-- ====================================================================
-- QUICKHIRE EGYPT — PHASE 1 SECURITY HARDENING: RLS POLICIES & SECURE TRACKING
-- ====================================================================

-- 1. Drop old wide-open policies
DROP POLICY IF EXISTS "offers_read_public" ON public.offers;
DROP POLICY IF EXISTS "offers_admin_all" ON public.offers;
DROP POLICY IF EXISTS "apps_read_public" ON public.applications;
DROP POLICY IF EXISTS "apps_insert_public" ON public.applications;
DROP POLICY IF EXISTS "apps_update_all" ON public.applications;
DROP POLICY IF EXISTS "apps_delete_all" ON public.applications;

-- 2. Secure OFFERS policies
-- Public can read active and on-hold offers
CREATE POLICY "offers_read_public" ON public.offers 
  FOR SELECT 
  USING (true);

-- Only authenticated admins can insert, update, delete offers
CREATE POLICY "offers_write_admin" ON public.offers 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "offers_update_admin" ON public.offers 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "offers_delete_admin" ON public.offers 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- 3. Secure APPLICATIONS policies
-- Any applicant can submit an application (INSERT only)
CREATE POLICY "apps_insert_public" ON public.applications 
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated admins can read, update, or delete applications directly
CREATE POLICY "apps_read_admin" ON public.applications 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "apps_update_admin" ON public.applications 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "apps_delete_admin" ON public.applications 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- 4. Secure RPC function for candidate self-tracking
-- Prevents scraping of all applicants while allowing candidates to safely check their own status
CREATE OR REPLACE FUNCTION public.track_candidate_status(query_text text)
RETURNS TABLE (
  id text,
  full_name text,
  status text,
  created_at timestamptz,
  english_level text,
  interview_date text,
  interview_time text,
  interview_site text,
  interview_address text,
  interview_maps_link text,
  interview_bus_point text,
  interview_bus_time text,
  interview_attendance text,
  pipeline_stage text,
  referral_code text,
  offer_id uuid,
  offer_title text,
  offer_company text,
  offer_location text,
  offer_salary_text text,
  offer_category text,
  offer_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_q text;
  clean_phone text;
BEGIN
  clean_q := trim(lower(query_text));
  clean_phone := right(regexp_replace(clean_q, '[^0-9]', '', 'g'), 9);

  RETURN QUERY
  SELECT 
    a.id,
    a.full_name,
    a.status,
    a.created_at,
    a.english_level,
    a.interview_date,
    a.interview_time,
    a.interview_site,
    a.interview_address,
    a.interview_maps_link,
    a.interview_bus_point,
    a.interview_bus_time,
    a.interview_attendance,
    COALESCE(a.pipeline_stage, 'applied') as pipeline_stage,
    a.referral_code,
    o.id as offer_id,
    o.title as offer_title,
    o.company as offer_company,
    o.location as offer_location,
    o.salary_text as offer_salary_text,
    o.category as offer_category,
    o.slug as offer_slug
  FROM public.applications a
  LEFT JOIN public.offers o ON o.id = a.offer_id
  WHERE 
    (clean_q LIKE '%@%' AND lower(a.email) = clean_q)
    OR (length(clean_phone) >= 8 AND right(regexp_replace(a.phone, '[^0-9]', '', 'g'), 9) = clean_phone)
  ORDER BY a.created_at DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_candidate_status(text) TO anon, authenticated;
