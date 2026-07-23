
-- Storage RLS: users manage their own files; admins access worker docs.
-- Path convention: <bucket>/<user_id>/<filename>

-- avatars (private, but any signed-in user can read anyone's avatar signed URL)
CREATE POLICY "avatars_read_all_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_read_anon" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- worker-gallery (public readable, owner writable)
CREATE POLICY "gallery_read_all" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'worker-gallery');

CREATE POLICY "gallery_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'worker-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "gallery_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'worker-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "gallery_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'worker-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

-- worker-docs (owner or admin read; owner write)
CREATE POLICY "docs_read_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'worker-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "docs_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'worker-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "docs_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'worker-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );

-- review-photos (readable by all authenticated, owner writable)
CREATE POLICY "review_photos_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "review_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
