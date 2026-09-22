"use client";

import { colorSwatchClass } from "@/lib/product-colors";
import { cn } from "@/lib/utils";

export function ColorSwatchRow({
  colors,
  selected,
  onSelect,
  disabled,
  label,
  className,
}: {
  colors: string[];
  selected?: string | undefined;
  onSelect?: ((color: string) => void) | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
  className?: string | undefined;
}) {
  if (!colors.length) return null;
  const interactive = Boolean(onSelect);

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-label={label || "Available colours"}
    >
      {colors.map((color) => {
        const isSelected = selected === color;
        const dot = (
          <span
            aria-hidden
            className={cn(
              "block size-3.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
              colorSwatchClass(color),
              isSelected ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : "",
            )}
          />
        );

        return (
          <li key={color}>
            {interactive ? (
              <button
                type="button"
                disabled={disabled}
                title={color}
                aria-label={color}
                aria-pressed={isSelected}
                onClick={() => onSelect?.(color)}
                className="inline-flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50"
              >
                {dot}
              </button>
            ) : (
              <span title={color} className="inline-flex size-7 items-center justify-center">
                {dot}
                <span className="sr-only">{color}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
