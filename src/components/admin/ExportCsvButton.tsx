import { headerOutlineClassName } from "@/lib/button-styles";

export function ExportCsvButton({
  type,
  label,
}: {
  type: "orders" | "customers" | "products" | "inventory";
  label?: string;
}) {
  return (
    <a href={`/api/admin/export/${type}`} className={headerOutlineClassName}>
      {label ?? `Export ${type} CSV`}
    </a>
  );
}
