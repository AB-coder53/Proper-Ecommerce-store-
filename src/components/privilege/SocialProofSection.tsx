"use client";

import { Star } from "lucide-react";

import { TESTIMONIALS } from "@/lib/privilege/content";

export function SocialProofSection() {
  return (
    <section
      aria-labelledby="community-heading"
      className="flex flex-col px-6 py-14 bg-sand w-full border-t border-b border-border"
    >
      <div className="max-w-xl mx-auto w-full flex flex-col">
        <div className="text-left mb-8">
          <span className="text-[10px] font-bold text-teal uppercase tracking-[0.16em] block mb-1">
            COMMUNITY REPUTATION
          </span>
          <h2
            id="community-heading"
            className="privilege-serif text-[34px] sm:text-[38px] text-[#111111] uppercase tracking-tight font-normal mb-1.5"
          >
            DON&apos;T TAKE OUR WORD FOR IT.
          </h2>
          <p className="text-[15px] text-[#444748]">
            Real unprompted reactions from buyers in Surat &amp; Mumbai.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-[#fcf9f3] p-5 shadow-sm flex flex-col transition-all duration-300 hover:shadow-md border border-transparent hover:border-[#c4c7c7]/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f0eee8] flex items-center justify-center text-[12px] font-bold text-[#111111]">
                    {testimonial.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-[#111111]">
                      {testimonial.name}
                    </span>
                    <span className="text-[11px] text-[#444748]">{testimonial.location}</span>
                  </div>
                </div>

                <div
                  className="flex items-center text-[#7C5E1D] gap-0.5"
                  role="img"
                  aria-label={`Rated ${testimonial.rating} out of 5 stars`}
                >
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#7C5E1D] text-[#7C5E1D]" />
                  ))}
                </div>
              </div>

              <div className="text-[14px] leading-relaxed text-[#1c1c18] mb-3 bg-[#f6f3ed] p-3.5 whitespace-pre-line">
                {testimonial.paragraphs.map((p, idx) => (
                  <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                    {p}
                  </p>
                ))}
              </div>

              <span className="text-[10px] text-[#444748] uppercase tracking-[0.14em] font-medium">
                ORDERED: {testimonial.orderedItem}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
