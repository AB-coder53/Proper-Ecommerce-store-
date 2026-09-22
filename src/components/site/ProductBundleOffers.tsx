import type { BundleOfferView } from "@/lib/store-offers";

export function ProductBundleOffers({ bundles }: { bundles: BundleOfferView[] }) {
  if (!bundles.length) return null;

  return (
    <section className="mt-10 space-y-4" aria-label="Bundle offers">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Bundle offers
      </p>
      {bundles.map((bundle) => (
        <article key={bundle.id} className="rounded-3xl border border-border bg-sand p-5">
          <h2 className="font-display text-xl font-bold">{bundle.title}</h2>
          <ul className="mt-4 space-y-2">
            {bundle.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 text-sm text-muted-foreground"
              >
                <span>{item.name}</span>
                <span className="shrink-0">{item.priceLabel}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Individual total</span>
              <span>{bundle.individualTotalLabel}</span>
            </div>
            <div className="flex justify-between font-semibold text-teal">
              <span>Bundle price</span>
              <span>{bundle.bundlePriceLabel}</span>
            </div>
            {bundle.savings > 0 ? (
              <p className="pt-1 text-xs text-muted-foreground">
                You save {bundle.savingsLabel} ({bundle.savingsPercent}%)
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
