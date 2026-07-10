
ALTER FUNCTION public.set_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "anyone can apply" ON public.applications;
CREATE POLICY "anyone can apply to active offers" ON public.applications
FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.status = 'active'));
