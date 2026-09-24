"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FAQS } from "@/lib/site";

export function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[0.4fr_0.6fr] lg:px-8 lg:py-20">
      <div>
        <p className="eyebrow">Questions</p>
        <h1 className="mt-4 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
          Everything you might ask
        </h1>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Still unsure?{" "}
          <Link href="/contact" className="text-foreground underline underline-offset-4">
            Contact us
          </Link>{" "}
          and we&apos;ll help.
        </p>
        <Button
          asChild
          className="mt-8 h-12 w-full max-w-xs rounded-full bg-teal px-8 text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase sm:w-auto sm:max-w-none"
        >
          <Link href="/collection">Shop Collection</Link>
        </Button>
      </div>

      <div className="border-t border-border">
        {FAQS.map((faq, index) => {
          const expanded = openIndex === index;
          return (
            <div key={faq.question} className="border-b border-border">
              <button
                type="button"
                onClick={() => setOpenIndex(expanded ? null : index)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-6 py-6 text-left"
              >
                <span className="text-base font-medium">{faq.question}</span>
                {expanded ? (
                  <Minus className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.25} />
                ) : (
                  <Plus className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.25} />
                )}
              </button>
              {expanded ? (
                <p className="max-w-xl pb-6 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
