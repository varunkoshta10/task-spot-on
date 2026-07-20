
-- Enforce column-level restrictions via triggers for customer edits and worker self-edits

CREATE OR REPLACE FUNCTION public.enforce_booking_update_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_customer boolean := (auth.uid() = OLD.customer_id);
  is_worker boolean := EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = OLD.worker_id AND wp.user_id = auth.uid());
  is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF is_admin THEN RETURN NEW; END IF;

  IF is_customer AND NOT is_worker THEN
    -- Customers may only edit: customer_notes, and cancel (status -> 'cancelled')
    IF NEW.worker_id IS DISTINCT FROM OLD.worker_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.category_id IS DISTINCT FROM OLD.category_id
       OR NEW.quoted_price IS DISTINCT FROM OLD.quoted_price
       OR NEW.final_price IS DISTINCT FROM OLD.final_price
       OR NEW.worker_notes IS DISTINCT FROM OLD.worker_notes
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.address IS DISTINCT FROM OLD.address
       OR NEW.latitude IS DISTINCT FROM OLD.latitude
       OR NEW.longitude IS DISTINCT FROM OLD.longitude
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      RAISE EXCEPTION 'Customers cannot modify these booking fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Customers can only cancel a booking';
    END IF;
  ELSIF is_worker AND NOT is_customer THEN
    -- Workers cannot edit customer-owned fields
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.worker_id IS DISTINCT FROM OLD.worker_id
       OR NEW.customer_notes IS DISTINCT FROM OLD.customer_notes THEN
      RAISE EXCEPTION 'Workers cannot modify these booking fields';
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_booking_update_rules ON public.bookings;
CREATE TRIGGER enforce_booking_update_rules
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_update_rules();

-- Worker profiles: prevent workers from editing trust/moderation columns
CREATE OR REPLACE FUNCTION public.enforce_worker_profile_update_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF is_admin THEN RETURN NEW; END IF;

  IF auth.uid() = OLD.user_id THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.rating_avg IS DISTINCT FROM OLD.rating_avg
       OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
       OR NEW.jobs_completed IS DISTINCT FROM OLD.jobs_completed
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Workers cannot modify verification, rating, status or ownership fields';
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_worker_profile_update_rules ON public.worker_profiles;
CREATE TRIGGER enforce_worker_profile_update_rules
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_profile_update_rules();

-- The rating recompute trigger runs as SECURITY DEFINER on reviews, so admin/system updates
-- to rating_avg/rating_count from that path bypass the check above (auth.uid() may be null).
-- Explicitly allow when there is no auth context (server-side/trigger).
CREATE OR REPLACE FUNCTION public.enforce_worker_profile_update_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  is_admin := public.has_role(uid, 'admin');
  IF is_admin THEN RETURN NEW; END IF;

  IF uid = OLD.user_id THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.rating_avg IS DISTINCT FROM OLD.rating_avg
       OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
       OR NEW.jobs_completed IS DISTINCT FROM OLD.jobs_completed
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Workers cannot modify verification, rating, status or ownership fields';
    END IF;
  END IF;

  RETURN NEW;
END; $$;
