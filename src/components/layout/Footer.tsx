import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-lg font-display font-bold">Skillora</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The marketplace to find, chat with and book trusted local pros — right where you are.
            </p>
          </div>
          <FooterCol title="Customers" links={[
            ["Find a pro", "/browse"],
            ["How it works", "/how-it-works"],
            ["My bookings", "/dashboard"],
          ]} />
          <FooterCol title="Professionals" links={[
            ["Become a pro", "/become-a-pro"],
            ["Worker dashboard", "/worker-dashboard"],
          ]} />
          <FooterCol title="Company" links={[
            ["About", "/how-it-works"],
            ["Sign in", "/auth"],
          ]} />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Skillora. All rights reserved.</p>
          <p>Made with care for the people who make things work.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}