import { Star } from "lucide-react";

export function StarRating({ value, size = 14, showValue = false, count }: { value: number; size?: number; showValue?: boolean; count?: number }) {
  return (
    <div className="inline-flex items-center gap-1 text-sm">
      <Star className="fill-warm text-warm" style={{ width: size, height: size }} />
      <span className="font-semibold">{value ? value.toFixed(1) : "New"}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-muted-foreground">({count})</span>
      ) : null}
      {showValue && !value ? <span className="text-muted-foreground">· No reviews yet</span> : null}
    </div>
  );
}