"use client";

import { ArrowRight, Layers, Package, Scissors } from "lucide-react";

import { ASSETS, VALUE_PILLARS } from "@/lib/privilege/content";

type OriginSectionProps = {
  onExploreArchive: () => void;
};

function getPillarIcon(name: string) {
  switch (name) {
    case "texture":
      return <Layers className="w-5 h-5 text-muted-foreground" />;
    case "straighten":
      return <Scissors className="w-5 h-5 text-muted-foreground" />;
    default:
      return <Package className="w-5 h-5 text-muted-foreground" />;
  }
}

export function OriginSection({ onExploreArchive }: OriginSectionProps) {
  return (
    <section
      aria-labelledby="origin-heading"
      className="flex flex-col px-6 py-14 bg-sand w-full border-t border-b border-border"
    >
      <div className="max-w-xl mx-auto w-full flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-teal uppercase tracking-[0.16em]">
            ORIGIN &amp; PHILOSOPHY
          </span>
        </div>

        <h2
          id="origin-heading"
          className="privilege-serif text-[34px] sm:text-[38px] text-foreground tracking-tight mb-8 uppercase font-normal"
        >
          BUILT WITH INTENTION.
        </h2>

        <div className="group flex flex-col bg-background p-4 shadow-sm mb-8 border border-border hover:border-teal/30 transition-all duration-300 rounded-2xl">
          <div className="relative w-full aspect-[4/5] bg-muted mb-4 overflow-hidden rounded-xl">
            <img
              src={ASSETS.founder}
              alt="Abbas Badwahwala, founder of AB Collection"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#111111]/85 via-[#111111]/40 to-transparent">
              <span className="text-[10px] font-semibold text-white uppercase tracking-[0.16em] block leading-tight">
                ABBAS BADWAHWALA
                <br />
                FOUNDER
              </span>
            </div>
          </div>

          <blockquote className="privilege-serif text-[20px] text-[#1c1c18] italic leading-snug mb-3">
            &ldquo;I started AB Collection with a simple idea that everyday clothes shouldn&apos;t
            force you to choose between quality, comfort and price.&rdquo;
          </blockquote>

          <span className="text-[10px] text-[#444748] uppercase tracking-[0.16em] font-semibold">
            AB COLLECTION • UJJAIN
          </span>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {VALUE_PILLARS.map((pillar) => (
            <div
              key={pillar.index}
              className="p-5 bg-[#fcf9f3] flex flex-col gap-1.5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-l-2 hover:border-[#111111] border border-transparent"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#7C5E1D] tracking-[0.16em]">
                  {pillar.index} / {pillar.category}
                </span>
                {getPillarIcon(pillar.iconName)}
              </div>

              <h3 className="privilege-serif text-[20px] text-[#111111] uppercase font-medium">
                {pillar.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[#444748]">{pillar.description}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onExploreArchive}
          className="group w-full min-h-[50px] py-3.5 bg-teal text-teal-foreground text-[12px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-2 hover:bg-teal/90 active:scale-[0.98] transition-all cursor-pointer rounded-full"
        >
          <span>EXPLORE THE ARCHIVE</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </button>
      </div>
    </section>
  );
}
