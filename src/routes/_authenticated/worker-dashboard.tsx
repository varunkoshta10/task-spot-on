import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Star, IndianRupee, CheckCircle2, PlayCircle, Flag, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/worker-dashboard")({
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const wp = useQuery({
    queryKey: ["my-worker-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("worker_profiles").select("*, category:categories(name)").eq("user_id", user!.id).maybeSingle()).data,
  });

  const jobs = useQuery({
    queryKey: ["worker-bookings", wp.data?.id],
    enabled: !!wp.data?.id,
    queryFn: async () => (await supabase
      .from("bookings")
      .select("*, customer:profiles!bookings_customer_id_fkey(full_name, avatar_url)")
      .eq("worker_id", wp.data!.id)
      .order("created_at", { ascending: false })).data ?? [],
  });

  const toggleOnline = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase.from("worker_profiles").update({ is_online: val }).eq("id", wp.data!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-worker-profile"] }),
  });

  // Push live GPS while online
  useEffect(() => {
    if (!wp.data?.id || !wp.data.is_online) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const workerId = wp.data.id;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        supabase.from("worker_locations").upsert({
          worker_id: workerId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? null,
          accuracy: pos.coords.accuracy ?? null,
          updated_at: new Date().toISOString(),
        }).then(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [wp.data?.id, wp.data?.is_online]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "completed") {
        patch.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
      if (status === "completed" && wp.data?.id) {
        await supabase.from("worker_profiles").update({ jobs_completed: (wp.data.jobs_completed ?? 0) + 1 }).eq("id", wp.data.id);
      }
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["worker-bookings"] });
      qc.invalidateQueries({ queryKey: ["my-worker-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (wp.isLoading) return <div className="mx-auto max-w-4xl px-6 py-16 text-center text-muted-foreground">Loading…</div>;

  if (!wp.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-display font-bold">You're not a pro yet</h1>
        <p className="mt-2 text-muted-foreground">Create your pro profile to start receiving bookings.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/worker-onboarding">Set up my profile</Link></Button>
      </div>
    );
  }

  const w = wp.data;
  const pending = jobs.data?.filter((j: any) => j.status === "pending") ?? [];
  const active = jobs.data?.filter((j: any) => ["accepted", "in_progress"].includes(j.status)) ?? [];
  const done = jobs.data?.filter((j: any) => ["completed", "cancelled", "rejected"].includes(j.status)) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">{w.category?.name}</div>
          <h1 className="text-2xl font-display font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">{w.is_online ? "You are visible to customers." : "You are currently offline."}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-2">
          <span className="text-sm font-medium">Available</span>
          <Switch checked={w.is_online} onCheckedChange={(v) => toggleOnline.mutate(v)} />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Star} label="Rating" value={w.rating_avg ? Number(w.rating_avg).toFixed(2) : "—"} />
        <Stat icon={CheckCircle2} label="Jobs done" value={String(w.jobs_completed ?? 0)} />
        <Stat icon={Flag} label="Pending" value={String(pending.length)} />
        <Stat icon={IndianRupee} label="Hourly rate" value={w.hourly_rate ? `₹${w.hourly_rate}` : "—"} />
      </div>

      <Section title="Requests waiting for you" empty="Nothing pending right now. Go online to receive requests.">
        {pending.map((b: any) => (
          <JobRow key={b.id} b={b}>
            <Button size="sm" onClick={() => setStatus.mutate({ id: b.id, status: "accepted" })} className="rounded-full">Accept</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: b.id, status: "rejected" })} className="rounded-full">Decline</Button>
          </JobRow>
        ))}
      </Section>

      <Section title="Active jobs" empty="No jobs in progress.">
        {active.map((b: any) => (
          <JobRow key={b.id} b={b}>
            {b.status === "accepted" ? (
              <Button size="sm" onClick={() => setStatus.mutate({ id: b.id, status: "in_progress" })} className="rounded-full">
                <PlayCircle className="mr-1 h-4 w-4" /> Start
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStatus.mutate({ id: b.id, status: "completed" })} className="rounded-full">
                <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
              </Button>
            )}
          </JobRow>
        ))}
      </Section>

      <Section title="History" empty="No past bookings.">
        {done.map((b: any) => <JobRow key={b.id} b={b} />)}
      </Section>

      <div className="mt-10 text-center">
        <Button asChild variant="outline" className="rounded-full"><Link to="/worker-onboarding">Edit my profile</Link></Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-2 text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-display font-semibold">{title}</h2>
      {arr.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function JobRow({ b, children }: { b: any; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
          {(b.customer?.full_name ?? "?").split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{b.customer?.full_name ?? "Customer"}</div>
          <p className="line-clamp-1 text-sm text-muted-foreground">{b.service_description}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {b.scheduled_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(b.scheduled_at).toLocaleString()}</span>}
            {b.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address}</span>}
            {b.quoted_price && <span className="inline-flex items-center gap-1"><IndianRupee className="h-3 w-3" />{b.quoted_price}</span>}
          </div>
        </div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
      <Link
        to="/bookings/$bookingId"
        params={{ bookingId: b.id }}
        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
      >
        <MessageSquare className="h-3.5 w-3.5" /> Open
      </Link>
    </div>
  );
}