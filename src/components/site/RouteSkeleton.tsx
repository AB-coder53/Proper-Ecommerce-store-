export function RouteSkeleton({
  variant = "page",
}: {
  variant?: "page" | "grid" | "pdp" | "form";
}) {
  if (variant === "grid") {
    return (
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="mx-auto h-10 w-64 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mt-4 h-4 w-96 max-w-full animate-pulse rounded-full bg-muted" />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl bg-muted">
              <div className="aspect-[4/5] animate-pulse bg-muted-foreground/10" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted-foreground/10" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "pdp") {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
        <div className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="h-20 w-full animate-pulse rounded-3xl bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="h-10 w-56 animate-pulse rounded-full bg-muted" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-full bg-muted" />
        <div className="mt-10 space-y-4">
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="h-10 w-48 animate-pulse rounded-full bg-muted" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
