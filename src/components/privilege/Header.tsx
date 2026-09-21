"use client";

import Link from "next/link";

import { ASSETS } from "@/lib/privilege/content";

export function PrivilegeHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-border">
      <div className="h-16 max-w-xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center min-w-[44px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Surat Drop
          </span>
        </div>

        <div className="flex items-center justify-center flex-1">
          <Link
            href="/"
            className="privilege-serif text-[20px] tracking-tight uppercase text-foreground font-medium hover:opacity-80 transition-opacity"
          >
            AB COLLECTION
          </Link>
        </div>

        <div className="flex items-center justify-end min-w-[44px]">
          <img
            src={ASSETS.profile}
            alt="Customer profile"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-border transition-transform duration-300 hover:scale-105"
            loading="eager"
          />
        </div>
      </div>
    </header>
  );
}
