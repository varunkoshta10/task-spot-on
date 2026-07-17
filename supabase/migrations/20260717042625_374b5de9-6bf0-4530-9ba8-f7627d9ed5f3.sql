-- 1. Add approximate location columns for public consumption
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS approx_latitude double precision
    GENERATED ALWAYS AS (round(latitude::numeric, 2)::double precision) STORED,
  ADD COLUMN IF NOT EXISTS approx_longitude double precision
    GENERATED ALWAYS AS (round(longitude::numeric, 2)::double precision) STORED;

-- 2. profiles: replace public read policy with role-split ones + column grants
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read basic profile info"
  ON public.profiles FOR SELECT TO anon USING (true);

-- Lock anon's column-level access to non-sensitive fields
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, city, created_at, updated_at)
  ON public.profiles TO anon;

-- 3. worker_profiles: replace public read policy with role-split ones + column grants
DROP POLICY IF EXISTS "Approved workers public read" ON public.worker_profiles;

CREATE POLICY "Authenticated can read approved workers"
  ON public.worker_profiles FOR SELECT TO authenticated
  USING (status = 'approved');

CREATE POLICY "Anon can read approved workers"
  ON public.worker_profiles FOR SELECT TO anon
  USING (status = 'approved');

-- Lock anon out of precise-location and address columns
REVOKE ALL ON public.worker_profiles FROM anon;
GRANT SELECT (
  id, user_id, category_id, headline, bio, experience_years, hourly_rate,
  minimum_charge, negotiable, service_radius_km, languages, skills,
  emergency_available, is_online, is_verified, status, rating_avg,
  rating_count, jobs_completed, response_minutes, approx_latitude,
  approx_longitude, created_at, updated_at
) ON public.worker_profiles TO anon;

-- 4. Lock down SECURITY DEFINER functions
-- Trigger-only helpers should never be called directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_worker_rating()  FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies for authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;