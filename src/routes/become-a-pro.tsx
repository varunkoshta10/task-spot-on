import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, IndianRupee, Calendar, Star, ShieldCheck, MapPin } from "lucide-react";

export const Route = createFileRoute("/become-a-pro")({
  head: () => ({
    meta: [
      { title: "Earn on Skillora — become a pro" },
      { name: "description", content: "Join Skillora and get bookings from customers near you. No sign-up fees. Own your schedule and pricing." },
      { property: "og:title", content: "Earn on Skillora — become a pro" },
      { property: "og:description", content: "Get bookings from customers near you. No sign-up fees. Own your schedule and pricing." },
    ],
  }),
  component: BecomeAPro,
});

function BecomeAPro() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-warm" /> For skilled professionals
        </span>
        <h1 className="mt-4 text-balance text-4xl font-display font-bold tracking-tight md:text-5xl">
          Do the work you love.<br className="hidden md:block" /> Get paid what you're worth.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Skillora sends you booking requests from customers near you. You set your rates, your radius, and your schedule.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/worker-onboarding">Start earning</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: IndianRupee, title: "Set your price", body: "Hourly, fixed or negotiable. You quote — the customer accepts." },
          { icon: Calendar, title: "Own your schedule", body: "Toggle available whenever you want. Reject anything that doesn't fit." },
          { icon: Star, title: "Build your reputation", body: "Real reviews from real bookings compound over time." },
          { icon: MapPin, title: "Local demand", body: "Only see requests inside your service radius." },
          { icon: ShieldCheck, title: "Get verified", body: "Aadhaar-verified pros rank higher and win more bookings." },
          { icon: Sparkles, title: "Zero sign-up fees", body: "Join free. We only take a small commission on completed jobs." },
        ].map((f) => (
          <div key={f.title} className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}