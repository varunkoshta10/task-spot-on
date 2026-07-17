import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MessageSquare, ShieldCheck, Star, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Skillora works" },
      { name: "description", content: "From needing a pro to job done in three steps. Learn how Skillora bookings, chat, and payments work." },
      { property: "og:title", content: "How Skillora works" },
      { property: "og:description", content: "From needing a pro to job done in three steps." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-balance text-4xl font-display font-bold md:text-5xl">Simple by design.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Skillora is built to remove the friction between having a problem and getting it fixed.
        </p>
      </div>

      <div className="mt-14 space-y-10">
        {[
          { icon: MapPin, title: "1. Share your location", body: "Turn on live location so we only show pros close enough to actually help you today." },
          { icon: Search, title: "2. Pick a pro that fits", body: "Filter by rating, distance, price, experience or emergency availability. See real portfolios and reviews." },
          { icon: MessageSquare, title: "3. Chat, confirm, book", body: "Send the request with your address, timing and an optional offer. The pro confirms or negotiates." },
          { icon: ShieldCheck, title: "4. Verified arrival", body: "Track the pro on the map. An OTP starts the job — nothing happens without your say-so." },
          { icon: Wallet, title: "5. Pay your way", body: "Pay online, by UPI or cash on completion — whatever works for both of you." },
          { icon: Star, title: "6. Leave a review", body: "Rate the experience across quality, punctuality, behaviour, and value. Great work compounds." },
        ].map((s) => (
          <div key={s.title} className="flex items-start gap-5 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted-foreground">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-3xl hero-gradient p-10 text-center text-primary-foreground">
        <h2 className="text-3xl font-display font-bold">Ready to find someone?</h2>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="rounded-full bg-background text-foreground">
            <Link to="/browse">Browse pros</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/become-a-pro">I want to work</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}