import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, MapPin, Heart, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkerCard } from "@/components/WorkerCard";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const statusStyle: Record<string, string> = {
  pending: "bg-warm/20 text-warm-foreground",
  accepted: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", user!.id).maybeSingle()).data,
  });

  const saveAvatar = useMutation({
    mutationFn: async (url: string | null) => {
      const { error } = await supabase.from("profiles").upsert({ id: user!.id, avatar_url: url });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bookings = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, worker:worker_profiles(id, profile:profiles(full_name, avatar_url), category:categories(name, icon))")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const favorites = useQuery({
    queryKey: ["my-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("worker:worker_profiles(id, user_id, headline, hourly_rate, minimum_charge, experience_years, rating_avg, rating_count, jobs_completed, is_verified, emergency_available, address, category:categories(name, icon), profile:profiles(full_name, avatar_url, city))")
        .eq("customer_id", user!.id);
      return (data ?? []).map((r: any) => r.worker).filter(Boolean);
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {user && (
        <div className="mb-8 flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Your profile</div>
            <h2 className="mt-1 text-lg font-display font-semibold">{profile.data?.full_name ?? "Welcome"}</h2>
            <p className="text-xs text-muted-foreground">Add a photo so pros know who they're chatting with.</p>
          </div>
          <ImageUpload
            bucket="avatars"
            userId={user.id}
            value={profile.data?.avatar_url ?? null}
            onUploaded={(url) => saveAvatar.mutate(url)}
            onRemove={() => saveAvatar.mutate(null)}
            shape="circle"
            label="Add photo"
          />
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-display font-bold tracking-tight">Your bookings</h1>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/browse">Find more pros <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      {bookings.data?.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">No bookings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">When you book a pro, you'll see the status here.</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/browse">Browse pros</Link></Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {bookings.data?.map((b: any) => (
          <Link
            key={b.id}
            to="/bookings/$bookingId"
            params={{ bookingId: b.id }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
          >
            {b.worker?.profile?.avatar_url ? (
              <img src={b.worker.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-sm font-semibold">
                {(b.worker?.profile?.full_name ?? "?").split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{b.worker?.profile?.full_name ?? "Pro"}</span>
                <span className="truncate text-sm text-muted-foreground">· {b.worker?.category?.name}</span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{b.service_description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {b.scheduled_at && (
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(b.scheduled_at).toLocaleString()}</span>
                )}
                {b.address && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address}</span>
                )}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle[b.status] ?? "bg-muted"}`}>{b.status.replace("_", " ")}</span>
          </Link>
        ))}
      </div>

      {favorites.data && favorites.data.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            <h2 className="text-2xl font-display font-bold">Your favorite pros</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.data.map((w: any) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}