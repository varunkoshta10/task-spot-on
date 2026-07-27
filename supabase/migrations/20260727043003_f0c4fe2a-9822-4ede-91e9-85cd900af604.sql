CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role (backend) may access

CREATE INDEX idx_phone_verifications_user ON public.phone_verifications(user_id, created_at DESC);

CREATE TRIGGER trg_phone_verifications_updated_at
BEFORE UPDATE ON public.phone_verifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_profile_phone_verification_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
     OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at THEN
    RAISE EXCEPTION 'Phone verification status can only be set by the verification service';
  END IF;
  -- changing the phone number invalidates verification
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_verified := false;
    NEW.phone_verified_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_phone_verification_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_phone_verification ON public.profiles;
CREATE TRIGGER trg_profiles_phone_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_phone_verification_rules();

CREATE OR REPLACE FUNCTION public.require_verified_phone_for_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE verified boolean;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  SELECT p.phone_verified INTO verified FROM public.profiles p WHERE p.id = NEW.customer_id;
  IF COALESCE(verified, false) = false THEN
    RAISE EXCEPTION 'Verify your phone number before booking';
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.require_verified_phone_for_booking() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bookings_require_verified_phone ON public.bookings;
CREATE TRIGGER trg_bookings_require_verified_phone
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.require_verified_phone_for_booking();