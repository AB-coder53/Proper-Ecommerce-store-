import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}) {
  const interactive = Boolean(onChange);
  return (
    <div className="inline-flex items-center gap-0.5" role={interactive ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const className = cn(
          size === "sm" ? "text-sm" : "text-lg",
          filled ? "text-[#b45309]" : "text-border",
        );
        if (!interactive) {
          return (
            <span key={star} className={className} aria-hidden>
              ★
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={cn(className, "inline-flex size-11 items-center justify-center leading-none")}
            onClick={() => onChange?.(star)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
