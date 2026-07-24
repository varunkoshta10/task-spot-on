-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  image_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR image_url IS NOT NULL)
);
CREATE INDEX idx_messages_booking ON public.messages(booking_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is caller a participant on the booking?
CREATE OR REPLACE FUNCTION public.is_booking_participant(_booking_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.worker_profiles wp ON wp.id = b.worker_id
    WHERE b.id = _booking_id AND (b.customer_id = _user_id OR wp.user_id = _user_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_booking_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_booking_participant(uuid, uuid) TO authenticated;

CREATE POLICY "Participants can read messages" ON public.messages
FOR SELECT TO authenticated
USING (public.is_booking_participant(booking_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants can send messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_booking_participant(booking_id, auth.uid()));

CREATE POLICY "Recipient can mark read" ON public.messages
FOR UPDATE TO authenticated
USING (public.is_booking_participant(booking_id, auth.uid()) AND sender_id <> auth.uid())
WITH CHECK (public.is_booking_participant(booking_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Notify participants when a message is sent
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cust uuid; work_user uuid; recipient uuid;
BEGIN
  SELECT b.customer_id, wp.user_id INTO cust, work_user
  FROM public.bookings b LEFT JOIN public.worker_profiles wp ON wp.id = b.worker_id
  WHERE b.id = NEW.booking_id;
  recipient := CASE WHEN NEW.sender_id = cust THEN work_user ELSE cust END;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, booking_id, link)
    VALUES (recipient, 'new_message', 'New message', COALESCE(LEFT(NEW.body, 120), 'Sent a photo'), NEW.booking_id, '/bookings/' || NEW.booking_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- Notify on booking events
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE work_user uuid;
BEGIN
  SELECT wp.user_id INTO work_user FROM public.worker_profiles wp WHERE wp.id = NEW.worker_id;
  IF TG_OP = 'INSERT' THEN
    IF work_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, booking_id, link)
      VALUES (work_user, 'booking_new', 'New booking request', COALESCE(LEFT(NEW.service_description, 120), 'Tap to view details'), NEW.id, '/bookings/' || NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- notify the customer
    INSERT INTO public.notifications(user_id, type, title, body, booking_id, link)
    VALUES (NEW.customer_id, 'booking_' || NEW.status, 'Booking ' || NEW.status, 'Your booking status changed', NEW.id, '/bookings/' || NEW.id);
    -- also notify worker on cancellation
    IF NEW.status = 'cancelled' AND work_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, booking_id, link)
      VALUES (work_user, 'booking_cancelled', 'Booking cancelled', 'The customer cancelled the booking', NEW.id, '/bookings/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_on_booking_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_booking_insert AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_change();
CREATE TRIGGER trg_notify_booking_update AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_change();

-- ============ WORKER LIVE LOCATIONS ============
CREATE TABLE public.worker_locations (
  worker_id uuid PRIMARY KEY REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  accuracy double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_worker_locations_updated ON public.worker_locations(updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_locations TO authenticated;
GRANT ALL ON public.worker_locations TO service_role;
ALTER TABLE public.worker_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read online worker locations" ON public.worker_locations
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.is_online = true));

CREATE POLICY "Worker manages own location" ON public.worker_locations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_locations;
ALTER TABLE public.worker_locations REPLICA IDENTITY FULL;

-- ============ REVIEW PHOTOS ============
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';