import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-teal-foreground"
          >
            Go home
          </Link>
          <Link
            href="/collection"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            View collection
          </Link>
        </div>
      </div>
    </div>
  );
}
