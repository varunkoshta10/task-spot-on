import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/worker-onboarding")({
  component: Onboarding,
});

const schema = z.object({
  category_id: z.string().uuid({ message: "Pick a profession" }),
  headline: z.string().trim().min(3, "Add a short headline").max(120),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  experience_years: z.coerce.number().int().min(0).max(70),
  hourly_rate: z.coerce.number().min(0).optional().or(z.nan()),
  minimum_charge: z.coerce.number().min(0).optional().or(z.nan()),
  service_radius_km: z.coerce.number().int().min(1).max(200),
  languages: z.string().trim().max(200),
  skills: z.string().trim().max(300),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  full_name: z.string().trim().min(2).max(120),
  negotiable: z.boolean(),
  emergency_available: z.boolean(),
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cats = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name, category_group").order("name")).data ?? [],
  });

  const existing = useQuery({
    queryKey: ["my-worker-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("worker_profiles").select("*, profile:profiles(full_name, phone)").eq("user_id", user!.id).maybeSingle()).data,
  });

  const [f, setF] = useState({
    category_id: "",
    headline: "",
    bio: "",
    experience_years: "0",
    hourly_rate: "",
    minimum_charge: "",
    service_radius_km: "10",
    languages: "English, Hindi",
    skills: "",
    address: "",
    phone: "",
    full_name: "",
    negotiable: true,
    emergency_available: false,
  });

  useEffect(() => {
    if (existing.data) {
      const e: any = existing.data;
      setF({
        category_id: e.category_id ?? "",
        headline: e.headline ?? "",
        bio: e.bio ?? "",
        experience_years: String(e.experience_years ?? 0),
        hourly_rate: e.hourly_rate?.toString() ?? "",
        minimum_charge: e.minimum_charge?.toString() ?? "",
        service_radius_km: String(e.service_radius_km ?? 10),
        languages: (e.languages ?? []).join(", "),
        skills: (e.skills ?? []).join(", "),
        address: e.address ?? "",
        phone: e.profile?.phone ?? "",
        full_name: e.profile?.full_name ?? "",
        negotiable: e.negotiable ?? true,
        emergency_available: e.emergency_available ?? false,
      });
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const r = schema.safeParse(f);
      if (!r.success) throw new Error(r.error.issues[0]!.message);
      const v = r.data;
      // update profile
      await supabase.from("profiles").upsert({ id: user!.id, full_name: v.full_name, phone: v.phone || null });

      // upsert worker profile
      const payload = {
        user_id: user!.id,
        category_id: v.category_id,
        headline: v.headline,
        bio: v.bio || null,
        experience_years: v.experience_years,
        hourly_rate: Number.isFinite(v.hourly_rate as number) ? v.hourly_rate : null,
        minimum_charge: Number.isFinite(v.minimum_charge as number) ? v.minimum_charge : null,
        service_radius_km: v.service_radius_km,
        languages: v.languages.split(",").map((s) => s.trim()).filter(Boolean),
        skills: v.skills.split(",").map((s) => s.trim()).filter(Boolean),
        address: v.address || null,
        negotiable: v.negotiable,
        emergency_available: v.emergency_available,
        status: "approved" as const, // auto-approve in v1
      };
      const { error } = await supabase.from("worker_profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      // ensure worker role
      await supabase.from("user_roles").upsert({ user_id: user!.id, role: "worker" as const });
    },
    onSuccess: () => {
      toast.success("Your pro profile is live!");
      navigate({ to: "/worker-dashboard" });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const grouped: Record<string, typeof cats.data> = {};
  for (const c of cats.data ?? []) (grouped[c.category_group] ??= []).push(c);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-display font-bold tracking-tight">Set up your pro profile</h1>
      <p className="mt-2 text-muted-foreground">A great profile gets 3× more bookings. Take 2 minutes to fill it in.</p>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
          </Field>
          <Field label="Phone">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Optional" />
          </Field>
        </div>

        <Field label="Your profession">
          <select
            value={f.category_id}
            onChange={(e) => setF({ ...f, category_id: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Choose a profession…</option>
            {Object.entries(grouped).map(([grp, items]) => (
              <optgroup key={grp} label={grp}>
                {items!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Headline" hint="One line that customers will see first.">
          <Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder="e.g. Certified electrician, 10 years, same-day service" required />
        </Field>

        <Field label="About you">
          <Textarea rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="What you specialize in, past work, why customers should trust you…" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Experience (years)">
            <Input type="number" min={0} value={f.experience_years} onChange={(e) => setF({ ...f, experience_years: e.target.value })} required />
          </Field>
          <Field label="Hourly rate (₹)">
            <Input type="number" min={0} value={f.hourly_rate} onChange={(e) => setF({ ...f, hourly_rate: e.target.value })} />
          </Field>
          <Field label="Minimum charge (₹)">
            <Input type="number" min={0} value={f.minimum_charge} onChange={(e) => setF({ ...f, minimum_charge: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service radius (km)">
            <Input type="number" min={1} max={200} value={f.service_radius_km} onChange={(e) => setF({ ...f, service_radius_km: e.target.value })} required />
          </Field>
          <Field label="Base address / area">
            <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="e.g. Koramangala, Bengaluru" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Languages" hint="Comma separated">
            <Input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} />
          </Field>
          <Field label="Skills / specialties" hint="Comma separated">
            <Input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Wiring, fan installation, MCB" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6 rounded-2xl bg-secondary/40 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={f.negotiable} onChange={(e) => setF({ ...f, negotiable: e.target.checked })} />
            My price is negotiable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={f.emergency_available} onChange={(e) => setF({ ...f, emergency_available: e.target.checked })} />
            Available for emergencies
          </label>
        </div>

        <Button type="submit" size="lg" disabled={save.isPending} className="w-full rounded-full">
          {save.isPending ? "Saving…" : existing.data ? "Update my profile" : "Go live on Skillora"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}