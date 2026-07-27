import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { getCategoryIcon } from "@/lib/category-icons";
import { MapPin, ShieldCheck, Zap, MessageSquare, Phone, Heart, ArrowLeft, Calendar, Clock, Languages } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

async function fetchWorker(id: string) {
  const { data, error } = await supabase
    .from("worker_profiles")
    .select(`
      id, user_id, category_id, headline, bio, experience_years, hourly_rate,
      minimum_charge, negotiable, service_radius_km, languages, skills,
      emergency_available, is_online, is_verified, status, rating_avg,
      rating_count, jobs_completed, response_minutes,
      latitude:approx_latitude, longitude:approx_longitude, created_at,
      category:categories(id, name, slug, icon, category_group),
      profile:profiles(full_name, avatar_url, city),
      gallery:worker_gallery(id, image_url, caption),
      reviews(id, rating, comment, created_at, quality, punctuality, behaviour, value, customer:profiles!reviews_customer_id_fkey(full_name, avatar_url))
    `)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return data as any;
}

export const Route = createFileRoute("/workers/$workerId")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["worker", params.workerId],
      queryFn: () => fetchWorker(params.workerId),
    });
  },
  head: ({ loaderData, params }) => {
    const w: any = loaderData;
    const name = w?.profile?.full_name ?? "Skillora pro";
    const cat = w?.category?.name ?? "professional";
    return {
      meta: [
        { title: `${name} — ${cat} on Skillora` },
        { name: "description", content: w?.headline ?? `Book ${name}, a verified ${cat} on Skillora.` },
        { property: "og:title", content: `${name} — ${cat}` },
        { property: "og:description", content: w?.headline ?? `Book a verified ${cat} on Skillora.` },
        ...(w?.profile?.avatar_url ? [{ property: "og:image", content: w.profile.avatar_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-display font-bold">Pro not found</h1>
      <p className="mt-2 text-muted-foreground">This professional might have moved on. Try browsing other pros.</p>
      <Button asChild className="mt-6 rounded-full"><Link to="/browse">Browse pros</Link></Button>
    </div>
  ),
  component: WorkerDetail,
});

function WorkerDetail() {
  const { workerId } = Route.useParams();
  const { data: w } = useSuspenseQuery({ queryKey: ["worker", workerId], queryFn: () => fetchWorker(workerId) });
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { data: phoneStatus } = useQuery({
    queryKey: ["phone-verified", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("phone_verified").eq("id", user!.id).maybeSingle()).data,
  });
  const phoneVerified = !!phoneStatus?.phone_verified;
  const CatIcon = getCategoryIcon(w.category?.icon);
  const name = w.profile?.full_name ?? "Pro";
  const initials = name.split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [address, setAddress] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [price, setPrice] = useState("");

  const book = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first");
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          worker_id: w.id,
          category_id: w.category?.id ?? null,
          service_description: desc,
          scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
          is_emergency: emergency,
          address: address || null,
          quoted_price: price ? Number(price) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setOpen(false);
      toast.success("Booking sent! The pro will confirm shortly.");
      navigate({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create booking"),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/browse" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          {/* Header card */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="h-28 hero-gradient" />
            <div className="px-6 pb-6">
              <div className="-mt-12 flex items-end gap-4">
                {w.profile?.avatar_url ? (
                  <img src={w.profile.avatar_url} alt={name} className="h-24 w-24 rounded-2xl border-4 border-card object-cover" />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-gradient-to-br from-primary to-primary-glow text-2xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <div className="pb-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-2xl font-display font-bold tracking-tight md:text-3xl">{name}</h1>
                    {w.is_verified && <ShieldCheck className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CatIcon className="h-4 w-4" /> {w.category?.name}</span>
                    <span>·</span>
                    <span>{w.experience_years ?? 0} years</span>
                  </div>
                  <div className="mt-1"><StarRating value={Number(w.rating_avg)} count={w.rating_count} /></div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {w.emergency_available && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warm/20 px-2 py-0.5 text-xs font-medium text-warm-foreground">
                    <Zap className="h-3 w-3" /> Emergency available
                  </span>
                )}
                {(w.languages ?? []).map((l: string) => (
                  <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                    <Languages className="h-3 w-3" /> {l}
                  </span>
                ))}
                {(w.skills ?? []).slice(0, 6).map((s: string) => (
                  <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* About */}
          <section className="mt-8">
            <h2 className="text-xl font-display font-bold">About</h2>
            <p className="mt-3 whitespace-pre-line text-foreground/85">{w.bio || w.headline || "This pro hasn't added a bio yet."}</p>
          </section>

          {/* Gallery */}
          {w.gallery?.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-display font-bold">Portfolio</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {w.gallery.map((g: any) => (
                  <img key={g.id} src={g.image_url} alt={g.caption ?? ""} className="aspect-square w-full rounded-2xl border border-border object-cover" />
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-display font-bold">Reviews</h2>
              <StarRating value={Number(w.rating_avg)} count={w.rating_count} />
            </div>
            {w.reviews?.length ? (
              <ul className="mt-4 space-y-4">
                {w.reviews.map((r: any) => (
                  <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-semibold">
                        {(r.customer?.full_name ?? "?").split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{r.customer?.full_name ?? "Customer"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="ml-auto"><StarRating value={r.rating} /></div>
                    </div>
                    {r.comment && <p className="mt-3 text-sm text-foreground/85">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No reviews yet — be the first to book this pro.</p>
            )}
          </section>
        </div>

        {/* Booking sidebar */}
        <aside className="md:sticky md:top-24 h-fit">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            {w.hourly_rate ? (
              <>
                <div className="text-3xl font-display font-bold">₹{w.hourly_rate}<span className="text-base font-medium text-muted-foreground">/hr</span></div>
                {w.negotiable && <div className="mt-1 text-xs text-muted-foreground">Rate is negotiable</div>}
              </>
            ) : w.minimum_charge ? (
              <div className="text-3xl font-display font-bold">from ₹{w.minimum_charge}</div>
            ) : (
              <div className="text-xl font-display font-semibold text-muted-foreground">Custom quote</div>
            )}
            {w.minimum_charge && w.hourly_rate && (
              <div className="mt-2 text-xs text-muted-foreground">Minimum charge ₹{w.minimum_charge}</div>
            )}

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{w.address ?? w.profile?.city ?? "Service near you"} · {w.service_radius_km}km radius</span>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="mt-6 w-full rounded-full"
                  onClick={(e) => {
                    if (!isAuthenticated) {
                      e.preventDefault();
                      navigate({ to: "/auth" });
                      return;
                    }
                    if (!phoneVerified) {
                      e.preventDefault();
                      toast.info("Verify your phone number to book a pro.");
                      navigate({ to: "/verify-phone" });
                    }
                  }}
                >
                  Book now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Book {name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="desc">What do you need?</Label>
                    <Textarea id="desc" required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the job in a few lines…" />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where should the pro come?" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="when">When</Label>
                      <Input id="when" type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="price">Your offer (₹)</Label>
                      <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} className="h-4 w-4" />
                    This is an emergency
                  </label>
                </div>
                <DialogFooter>
                  <Button onClick={() => book.mutate()} disabled={!desc || book.isPending} className="rounded-full">
                    {book.isPending ? "Sending…" : "Send booking"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-full" disabled>
                <MessageSquare className="mr-1 h-4 w-4" /> Chat
              </Button>
              <Button variant="outline" className="rounded-full" disabled>
                <Phone className="mr-1 h-4 w-4" /> Call
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Chat &amp; call coming soon</p>
          </div>
        </aside>
      </div>
    </div>
  );
}