import Link from "next/link";

import { LEGAL_CONTACT } from "@/lib/legal/contact";
import { LEGAL_NAV_LINKS } from "@/lib/legal/content";
import type { LegalBlock, LegalDocument } from "@/lib/legal/types";

type LegalPageProps = {
  document: LegalDocument;
};

function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p
              key={`${index}-${block.text.slice(0, 32)}`}
              className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === "subheading") {
          return (
            <p
              key={`${index}-${block.text}`}
              className="mt-4 text-sm font-medium text-foreground sm:text-base"
            >
              {block.text}
            </p>
          );
        }

        return (
          <ul
            key={`${index}-list`}
            className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            {block.items.map((item) => (
              <li key={item.slice(0, 48)}>{item}</li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

export function LegalPage({ document }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-4 font-display text-[2rem] font-bold tracking-tight sm:text-4xl">
        {document.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: {document.lastUpdated}</p>

      {document.intro?.map((paragraph) => (
        <p
          key={paragraph.slice(0, 40)}
          className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          {paragraph}
        </p>
      ))}

      <div className="mt-10 space-y-10">
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {section.title}
            </h2>
            <LegalBlocks blocks={section.blocks} />
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-border bg-sand p-6">
        <h2 className="font-display text-lg font-semibold">Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {LEGAL_CONTACT.brand}
          <br />
          Email:{" "}
          <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-teal hover:underline">
            {LEGAL_CONTACT.email}
          </a>
          <br />
          Phone / WhatsApp:{" "}
          <a
            href={`tel:${LEGAL_CONTACT.phone.replace(/\s/g, "")}`}
            className="text-teal hover:underline"
          >
            {LEGAL_CONTACT.phone}
          </a>
        </p>
      </section>

      <nav
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-8 text-sm text-muted-foreground"
        aria-label="Other policies"
      >
        {LEGAL_NAV_LINKS.filter((link) => link.href !== `/${document.slug}`).map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
