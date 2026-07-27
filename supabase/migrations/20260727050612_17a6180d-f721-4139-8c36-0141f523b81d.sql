CREATE TABLE public.phone_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_login_codes TO service_role;

ALTER TABLE public.phone_login_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to phone login codes"
ON public.phone_login_codes FOR ALL
USING (false) WITH CHECK (false);

CREATE INDEX idx_phone_login_codes_phone_created ON public.phone_login_codes (phone, created_at DESC);

CREATE TRIGGER trg_phone_login_codes_updated_at
BEFORE UPDATE ON public.phone_login_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();