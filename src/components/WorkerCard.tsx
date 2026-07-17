import { Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Zap } from "lucide-react";
import { StarRating } from "./StarRating";

export type WorkerCardData = {
  id: string;
  user_id: string;
  headline: string | null;
  hourly_rate: number | null;
  minimum_charge: number | null;
  experience_years: number | null;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  is_verified: boolean;
  emergency_available: boolean;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  profile: { full_name: string | null; avatar_url: string | null; city: string | null } | null;
  category: { name: string; icon: string | null } | null;
};

export function WorkerCard({ worker }: { worker: WorkerCardData }) {
  const name = worker.profile?.full_name ?? "Pro";
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const location = worker.address ?? worker.profile?.city ?? "Available near you";

  return (
    <Link
      to="/workers/$workerId"
      params={{ workerId: worker.id }}
      className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="flex items-start gap-4">
        {worker.profile?.avatar_url ? (
          <img src={worker.profile.avatar_url} alt={name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-lg font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold">{name}</h3>
            {worker.is_verified ? <ShieldCheck className="h-4 w-4 text-primary" /> : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {worker.category?.name ?? "Pro"} · {worker.experience_years ?? 0}y experience
          </p>
          <div className="mt-1.5">
            <StarRating value={worker.rating_avg} count={worker.rating_count} />
          </div>
        </div>
      </div>

      {worker.headline ? (
        <p className="mt-4 line-clamp-2 text-sm text-foreground/80">{worker.headline}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {worker.emergency_available ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warm/20 px-2 py-0.5 text-xs font-medium text-warm-foreground">
            <Zap className="h-3 w-3" /> Emergency
          </span>
        ) : null}
        {worker.jobs_completed > 0 ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {worker.jobs_completed} jobs
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-4">
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {typeof worker.distance_km === "number"
                ? `${worker.distance_km.toFixed(1)} km away`
                : location}
            </span>
          </span>
        </div>
        <div className="text-right">
          {worker.hourly_rate ? (
            <>
              <div className="text-lg font-bold text-foreground">₹{worker.hourly_rate}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">per hour</div>
            </>
          ) : worker.minimum_charge ? (
            <>
              <div className="text-lg font-bold">from ₹{worker.minimum_charge}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">visit</div>
            </>
          ) : (
            <div className="text-sm font-semibold text-muted-foreground">Ask for quote</div>
          )}
        </div>
      </div>
    </Link>
  );
}