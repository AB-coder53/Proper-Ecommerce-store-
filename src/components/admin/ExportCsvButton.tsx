export function ExportCsvButton({
  type,
  label,
}: {
  type: "orders" | "customers" | "products" | "inventory";
  label?: string;
}) {
  return (
    <a
      href={`/api/admin/export/${type}`}
      className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted"
    >
      {label ?? `Export ${type} CSV`}
    </a>
  );
}
