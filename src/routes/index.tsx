import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, ShieldCheck, Zap, Clock, MessageSquare, Star, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryCard } from "@/components/CategoryCard";
import { WorkerCard, type WorkerCardData } from "@/components/WorkerCard";
import { useGeolocation, distanceKm } from "@/hooks/useGeolocation";
import heroImg from "@/assets/hero-professionals.jpg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["home-data"],
      queryFn: fetchHomeData,
    });
  },
  component: Home,
});

async function fetchHomeData() {
  const [cats, workers] = await Promise.all([
    supabase.from("categories").select("id, name, slug, icon, category_group, emergency_capable, sort_order").order("sort_order"),
    supabase
      .from("worker_profiles")
      .select("id, user_id, headline, hourly_rate, minimum_charge, experience_years, rating_avg, rating_count, jobs_completed, is_verified, emergency_available, address, latitude, longitude, category:categories(name, icon), profile:profiles(full_name, avatar_url, city)")
      .eq("status", "approved")
      .order("rating_avg", { ascending: false })
      .limit(8),
  ]);
  return { categories: cats.data ?? [], workers: (workers.data ?? []) as unknown as WorkerCardData[] };
}

function Home() {
  const { data } = useSuspenseQuery({ queryKey: ["home-data"], queryFn: fetchHomeData });
  const { coords, status, request } = useGeolocation();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const popularCats = data.categories.slice(0, 10);
  const allGroups = useMemo(() => {
    const g: Record<string, typeof data.categories> = {};
    for (const c of data.categories) (g[c.category_group] ??= []).push(c);
    return g;
  }, [data.categories]);

  const workersWithDist = coords
    ? data.workers.map((w) => ({
        ...w,
        distance_km: w.latitude != null && w.longitude != null
          ? distanceKm(coords, { latitude: w.latitude as number, longitude: w.longitude as number })
          : null,
      }))
    : data.workers;

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/browse", search: { q } as any });
  }

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 hero-gradient opacity-[0.06]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.15fr_1fr] md:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-warm" />
              45+ professions, live near you
            </span>
            <h1 className="text-balance text-4xl font-display font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Hire someone who <span className="text-primary">actually shows up.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Skillora connects you with verified electricians, tutors, cooks, mechanics and 40+ more —
              ranked by distance, rating and price. Chat, book, done.
            </p>

            <form onSubmit={goSearch} className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-card p-2 shadow-[var(--shadow-elevated)] sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="What do you need? Electrician, tutor, cook…"
                  className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                />
              </div>
              <button
                type="button"
                onClick={request}
                className="mx-3 flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary sm:mx-0"
              >
                <MapPin className="h-3.5 w-3.5" />
                {status === "granted" ? "Location on" : status === "loading" ? "Locating…" : "Use my location"}
              </button>
              <Button type="submit" size="lg" className="rounded-full">Search</Button>
            </form>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Electrician", "Plumber", "Tutor", "Cook", "AC Technician", "Painter"].map((tag) => (
                <Link key={tag} to="/browse" search={{ q: tag } as any} className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary">
                  {tag}
                </Link>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <Trust icon={ShieldCheck} label="Verified pros" />
              <Trust icon={Star} label="4.8 average rating" />
              <Trust icon={Clock} label="24/7 emergency" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] hero-gradient opacity-20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-elevated)]">
              <img
                src={heroImg}
                alt="Skilled professionals ready to help"
                width={1600}
                height={1100}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 p-3 backdrop-blur">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">Aadhaar-verified professionals</div>
                  <div className="text-xs text-muted-foreground">Live location · Real reviews · Transparent pricing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHead
          eyebrow="Popular"
          title="What are you looking for?"
          action={<Link to="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">See all <ArrowRight className="h-4 w-4" /></Link>}
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {popularCats.map((c) => (
            <CategoryCard key={c.id} name={c.name} slug={c.slug} icon={c.icon} />
          ))}
        </div>
      </section>

      {/* FEATURED WORKERS */}
      {data.workers.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-8">
          <SectionHead
            eyebrow="Top rated"
            title="Trusted pros near you"
            action={<Link to="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Browse all <ArrowRight className="h-4 w-4" /></Link>}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workersWithDist.slice(0, 4).map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <SectionHead eyebrow="How it works" title="From need to done in three steps" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: "Search near you", body: "Turn on location or search a profession. Filter by rating, distance and price." },
            { icon: MessageSquare, title: "Chat & agree", body: "Message a pro, get a quote, and confirm timing. Negotiate if it's flexible." },
            { icon: ShieldCheck, title: "Get it done", body: "The pro shows up, completes the job, and you rate the experience." },
          ].map((s, i) => (
            <div key={s.title} className="relative rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
              <div className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Step {i + 1}</div>
              <s.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES BY GROUP */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHead eyebrow="All services" title="Every profession you might need" />
        <div className="mt-8 space-y-8">
          {Object.entries(allGroups).slice(0, 6).map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((c) => (
                  <CategoryCard key={c.id} name={c.name} slug={c.slug} icon={c.icon} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] hero-gradient p-10 text-primary-foreground md:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-warm/20 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-display font-bold leading-tight md:text-4xl">
                Are you the pro people are looking for?
              </h2>
              <p className="mt-3 max-w-md text-primary-foreground/85">
                Join Skillora and get bookings from customers near you. No fees to sign up.
                Own your schedule, your prices and your reviews.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="secondary" className="rounded-full bg-background text-foreground hover:bg-background/90">
                <Link to="/become-a-pro">Start earning <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/how-it-works">Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Trust({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-primary" />
      <span className="font-medium text-foreground/80">{label}</span>
    </div>
  );
}

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</div>
        <h2 className="mt-1 text-3xl font-display font-bold tracking-tight md:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
