import { Link } from "@tanstack/react-router";
import { getCategoryIcon } from "@/lib/category-icons";

export function CategoryCard({ name, slug, icon, count }: { name: string; slug: string; icon: string | null; count?: number }) {
  const Icon = getCategoryIcon(icon);
  return (
    <Link
      to="/browse"
      search={{ category: slug }}
      className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{name}</div>
        {typeof count === "number" ? (
          <div className="text-xs text-muted-foreground">{count} pros nearby</div>
        ) : null}
      </div>
    </Link>
  );
}