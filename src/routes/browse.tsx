import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, SlidersHorizontal, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkerCard, type WorkerCardData } from "@/components/WorkerCard";
import { getCategoryIcon } from "@/lib/category-icons";
import { useGeolocation, distanceKm } from "@/hooks/useGeolocation";

type Search = { q?: string; category?: string; sort?: string; emergency?: string };

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    sort: typeof s.sort === "string" ? s.sort : "rating",
    emergency: typeof s.emergency === "string" ? s.emergency : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse pros near you — Skillora" },
      { name: "description", content: "Search verified electricians, plumbers, tutors, cooks and more. Filter by location, rating and price." },
      { property: "og:title", content: "Browse pros near you — Skillora" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData({ queryKey: ["browse"], queryFn: fetchBrowseData });
  },
  component: Browse,
});

async function fetchBrowseData() {
  const [cats, workers] = await Promise.all([
    supabase.from("categories").select("id, name, slug, icon").order("sort_order"),
    supabase
      .from("worker_profiles")
      .select("id, user_id, headline, hourly_rate, minimum_charge, experience_years, rating_avg, rating_count, jobs_completed, is_verified, emergency_available, address, latitude, longitude, category:categories(id, name, slug, icon), profile:profiles(full_name, avatar_url, city)")
      .eq("status", "approved"),
  ]);
  return { categories: cats.data ?? [], workers: (workers.data ?? []) as unknown as (WorkerCardData & { latitude: number | null; longitude: number | null; category: any })[] };
}

function Browse() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery({ queryKey: ["browse"], queryFn: fetchBrowseData });
  const { coords, status, request } = useGeolocation();
  const [qLocal, setQLocal] = useState(search.q ?? "");

  const filtered = useMemo(() => {
    let list = data.workers.slice();
    if (search.category) {
      list = list.filter((w) => w.category?.slug === search.category);
    }
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter(
        (w) =>
          (w.profile?.full_name ?? "").toLowerCase().includes(q) ||
          (w.category?.name ?? "").toLowerCase().includes(q) ||
          (w.headline ?? "").toLowerCase().includes(q),
      );
    }
    if (search.emergency === "1") list = list.filter((w) => w.emergency_available);

    const withDist = coords
      ? list.map((w) => ({
          ...w,
          distance_km:
            w.latitude != null && w.longitude != null
              ? distanceKm(coords, { latitude: w.latitude as number, longitude: w.longitude as number })
              : null,
        }))
      : list.map((w) => ({ ...w, distance_km: null }));

    if (search.sort === "nearest" && coords) {
      withDist.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    } else if (search.sort === "price-low") {
      withDist.sort((a, b) => (a.hourly_rate ?? 1e9) - (b.hourly_rate ?? 1e9));
    } else if (search.sort === "experience") {
      withDist.sort((a, b) => (b.experience_years ?? 0) - (a.experience_years ?? 0));
    } else {
      withDist.sort((a, b) => b.rating_avg - a.rating_avg);
    }
    return withDist;
  }, [data.workers, search, coords]);

  const activeCat = data.categories.find((c) => c.slug === search.category);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-3 rounded-3xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ search: (s: Search) => ({ ...s, q: qLocal || undefined }) });
            }}
            placeholder="Search a profession or name"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <Button variant="outline" onClick={request} className="rounded-2xl">
          <MapPin className="mr-1 h-4 w-4" />
          {status === "granted" ? "Location on" : "Use my location"}
        </Button>
        <select
          value={search.sort ?? "rating"}
          onChange={(e) => navigate({ search: (s: Search) => ({ ...s, sort: e.target.value }) })}
          className="rounded-2xl border border-input bg-background px-4 py-2 text-sm"
        >
          <option value="rating">Highest rated</option>
          <option value="nearest">Nearest first</option>
          <option value="price-low">Lowest price</option>
          <option value="experience">Most experienced</option>
        </select>
        <Button
          variant={search.emergency ? "default" : "outline"}
          onClick={() =>
            navigate({ search: (s: Search) => ({ ...s, emergency: s.emergency ? undefined : "1" }) })
          }
          className="rounded-2xl"
        >
          <Zap className="mr-1 h-4 w-4" /> Emergency
        </Button>
      </div>

      {/* Category chips */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <Link
          to="/browse"
          search={(s: Search) => ({ ...s, category: undefined })}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${!search.category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}
        >
          All
        </Link>
        {data.categories.map((c) => {
          const Icon = getCategoryIcon(c.icon);
          const active = search.category === c.slug;
          return (
            <Link
              key={c.id}
              to="/browse"
              search={(s: Search) => ({ ...s, category: c.slug })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {c.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-bold tracking-tight md:text-3xl">
          {activeCat ? activeCat.name : "All professionals"}
        </h1>
        <p className="text-sm text-muted-foreground">{filtered.length} found</p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
          <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No pros here yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Skillora is just getting started in your area. Try a different filter or invite a pro you know.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/become-a-pro">Invite a pro</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => (
            <WorkerCard key={w.id} worker={w} />
          ))}
        </div>
      )}
    </div>
  );
}