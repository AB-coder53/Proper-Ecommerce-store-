"use client";

import { useEffect, useState } from "react";

/** Offer closes at 12:00 am IST on 6 October 2026. */
const OFFER_ENDS_AT = new Date("2026-10-06T00:00:00+05:30").getTime();

function part(value: number) {
  return String(value).padStart(2, "0");
}

export function IstefadaCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, OFFER_ENDS_AT - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const units = [
    { label: "Days", value: part(days) },
    { label: "Hours", value: part(hours) },
    { label: "Min", value: part(minutes) },
    { label: "Sec", value: part(seconds) },
  ];

  return (
    <div className="mb-6 w-full rounded-2xl border border-teal/30 bg-white px-4 py-4 text-center">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-teal uppercase">
        {remaining > 0 ? "Offer closes 6 October, 12:00 am" : "Offer closed"}
      </p>
      {remaining > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {units.map((unit) => (
            <div key={unit.label} className="rounded-xl bg-ink px-2 py-3 text-ink-foreground">
              <p className="font-display text-2xl leading-none font-semibold">{unit.value}</p>
              <p className="mt-1 text-[10px] tracking-[0.12em] text-teal uppercase">{unit.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          The Istefada offer ended at midnight on 6 October.
        </p>
      )}
    </div>
  );
}
