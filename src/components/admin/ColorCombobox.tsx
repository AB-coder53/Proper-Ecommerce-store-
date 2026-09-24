"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { colorsMatch, colorSwatchClass, PRODUCT_COLOR_NAMES } from "@/lib/product-colors";
import { cn } from "@/lib/utils";

export function ColorCombobox({
  value,
  onChange,
  usedColors = [],
}: {
  value: string;
  onChange: (color: string) => void;
  usedColors?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const taken = useMemo(
    () =>
      new Set(
        usedColors
          .map((color) => color.trim().toLowerCase())
          .filter((color) => color && !colorsMatch(color, value)),
      ),
    [usedColors, value],
  );

  const custom = query.trim();
  const customInList = PRODUCT_COLOR_NAMES.some((name) => colorsMatch(name, custom));
  const customTaken = taken.has(custom.toLowerCase());
  const showCustom = custom.length > 0 && !customInList && custom.length <= 40;

  const commit = (color: string) => {
    onChange(color);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1 h-11 w-full justify-between rounded-xl border-border bg-white px-3 font-normal shadow-none"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                colorSwatchClass(value || "unknown"),
              )}
            />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "Select colour"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Search colours..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No colour found.</CommandEmpty>
            <CommandGroup>
              {showCustom ? (
                <CommandItem
                  value={custom}
                  disabled={customTaken}
                  onSelect={() => {
                    if (!customTaken) commit(custom);
                  }}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                      colorSwatchClass(custom),
                    )}
                  />
                  Use “{custom}”
                  {customTaken ? (
                    <span className="ml-auto text-xs text-muted-foreground">Added</span>
                  ) : null}
                </CommandItem>
              ) : null}
              {PRODUCT_COLOR_NAMES.map((name) => {
                const disabled = taken.has(name.toLowerCase());
                const selected = colorsMatch(name, value);
                return (
                  <CommandItem
                    key={name}
                    value={name}
                    disabled={disabled}
                    onSelect={() => {
                      if (!disabled) commit(name);
                    }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                        colorSwatchClass(name),
                      )}
                    />
                    {name}
                    {disabled ? (
                      <span className="ml-auto text-xs text-muted-foreground">Added</span>
                    ) : selected ? (
                      <Check className="ml-auto size-4" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
