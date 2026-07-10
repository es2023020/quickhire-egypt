
-- Anyone can upload to cvs and voice-notes; only admins can read
CREATE POLICY "anon upload cvs" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cvs');
CREATE POLICY "admin read cvs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon upload voice" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'voice-notes');
CREATE POLICY "admin read voice" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND public.has_role(auth.uid(), 'admin'));
