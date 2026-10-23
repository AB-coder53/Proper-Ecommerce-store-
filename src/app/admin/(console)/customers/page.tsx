import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { listCustomersAdmin } from "@/lib/commerce.server";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listCustomersAdmin();

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description={`${customers.length} registered customers`}
        actions={<ExportCsvButton type="customers" label="Export CSV" />}
      />
      <CustomersTable customers={customers} />
    </>
  );
}
