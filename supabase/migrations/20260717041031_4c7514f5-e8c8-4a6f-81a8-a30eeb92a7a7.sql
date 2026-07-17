
-- Roles enum + user_roles table (security-critical: roles NEVER on profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'worker', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  category_group TEXT NOT NULL,
  emergency_capable BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Worker profiles
CREATE TYPE public.worker_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
CREATE TABLE public.worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  headline TEXT,
  bio TEXT,
  experience_years INT DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  minimum_charge NUMERIC(10,2),
  negotiable BOOLEAN NOT NULL DEFAULT true,
  service_radius_km INT NOT NULL DEFAULT 10,
  languages TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  emergency_available BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status worker_status NOT NULL DEFAULT 'pending',
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  jobs_completed INT NOT NULL DEFAULT 0,
  response_minutes INT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.worker_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved workers public read" ON public.worker_profiles FOR SELECT USING (status = 'approved');
CREATE POLICY "Workers read own profile" ON public.worker_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all workers" ON public.worker_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers insert own profile" ON public.worker_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Workers update own profile" ON public.worker_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update workers" ON public.worker_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.worker_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_workers_category ON public.worker_profiles(category_id) WHERE status = 'approved';
CREATE INDEX idx_workers_location ON public.worker_profiles(latitude, longitude) WHERE status = 'approved';

-- Worker gallery
CREATE TABLE public.worker_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.worker_gallery TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.worker_gallery TO authenticated;
GRANT ALL ON public.worker_gallery TO service_role;
ALTER TABLE public.worker_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gallery public read" ON public.worker_gallery FOR SELECT USING (true);
CREATE POLICY "Owners manage own gallery" ON public.worker_gallery FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()));

-- Bookings
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected');
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  service_description TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  quoted_price NUMERIC(10,2),
  final_price NUMERIC(10,2),
  status booking_status NOT NULL DEFAULT 'pending',
  customer_notes TEXT,
  worker_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers see own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Workers see own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()));
CREATE POLICY "Admins see all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Workers update own bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = worker_id AND wp.user_id = auth.uid()));
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality INT CHECK (quality BETWEEN 1 AND 5),
  punctuality INT CHECK (punctuality BETWEEN 1 AND 5),
  behaviour INT CHECK (behaviour BETWEEN 1 AND 5),
  value INT CHECK (value BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers review completed booking" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid() AND b.status = 'completed')
  );

-- Recompute rating aggregate on review insert
CREATE OR REPLACE FUNCTION public.recompute_worker_rating() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.worker_profiles wp
  SET rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE worker_id = NEW.worker_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.reviews WHERE worker_id = NEW.worker_id)
  WHERE wp.id = NEW.worker_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_recompute_rating AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.recompute_worker_rating();

-- Favorites
CREATE TABLE public.favorites (
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, worker_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- Seed categories
INSERT INTO public.categories (name, slug, icon, category_group, emergency_capable, sort_order) VALUES
('Electrician','electrician','Zap','Home Services',true,1),
('Plumber','plumber','Wrench','Home Services',true,2),
('Carpenter','carpenter','Hammer','Home Services',false,3),
('AC Technician','ac-technician','Snowflake','Home Services',true,4),
('Painter','painter','Paintbrush','Home Services',false,5),
('Mason','mason','Brick','Construction',false,6),
('Welder','welder','Flame','Construction',false,7),
('Cleaner','cleaner','Sparkles','Cleaning',false,10),
('Maid','maid','Home','Cleaning',false,11),
('Cook','cook','ChefHat','Cooking',false,12),
('Driver','driver','Car','Transportation',true,13),
('Security Guard','security-guard','Shield','Home Services',true,14),
('Gardener','gardener','Trees','Home Services',false,15),
('Barber','barber','Scissors','Beauty',false,20),
('Beautician','beautician','Flower','Beauty',false,21),
('Makeup Artist','makeup-artist','Palette','Beauty',false,22),
('Tailor','tailor','Shirt','Home Services',false,23),
('Tutor','tutor','GraduationCap','Education',false,30),
('Home Tutor','home-tutor','BookOpen','Education',false,31),
('Guitar Teacher','guitar-teacher','Music','Music',false,32),
('Piano Teacher','piano-teacher','Music2','Music',false,33),
('Cricket Coach','cricket-coach','Trophy','Sports',false,34),
('Football Coach','football-coach','Trophy','Sports',false,35),
('Gym Trainer','gym-trainer','Dumbbell','Fitness',false,36),
('Yoga Instructor','yoga-instructor','Heart','Fitness',false,37),
('Photographer','photographer','Camera','Photography',false,40),
('Videographer','videographer','Video','Photography',false,41),
('Graphic Designer','graphic-designer','PenTool','Freelancers',false,42),
('Web Developer','web-developer','Code','Technology',false,43),
('Mobile App Developer','mobile-app-developer','Smartphone','Technology',false,44),
('Computer Repair','computer-repair','Laptop','Repair',true,45),
('Mobile Repair','mobile-repair','Smartphone','Repair',true,46),
('Mechanic','mechanic','Wrench','Repair',true,47),
('Event Planner','event-planner','PartyPopper','Events',false,50),
('DJ','dj','Disc3','Events',false,51),
('Interior Designer','interior-designer','LayoutGrid','Home Services',false,52),
('Architect','architect','Building2','Business Services',false,53),
('Lawyer','lawyer','Scale','Legal',false,60),
('Accountant','accountant','Calculator','Finance',false,61),
('Consultant','consultant','Briefcase','Business Services',false,62),
('Delivery Partner','delivery-partner','Package','Transportation',true,63),
('Pet Trainer','pet-trainer','Dog','Pet Care',false,70),
('Dog Walker','dog-walker','Dog','Pet Care',false,71),
('Babysitter','babysitter','Baby','Home Services',false,72),
('Nurse','nurse','Stethoscope','Medical',true,73),
('Caregiver','caregiver','HeartHandshake','Medical',true,74);
