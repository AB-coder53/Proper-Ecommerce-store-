import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth.server";
import { listCustomersAdmin } from "@/lib/commerce.server";
import { formatInr } from "@/lib/price";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const customers = await listCustomersAdmin();

  return (
    <AdminShell username={session.username}>
      <div>
        <h1 className="font-display text-3xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {customers.length} registered customers
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs tracking-[0.08em] text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="font-medium text-teal hover:underline"
                  >
                    {customer.fullName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{customer.email}</div>
                </td>
                <td className="px-4 py-3">
                  {customer.phone}
                  {customer.alternatePhone ? (
                    <div className="text-xs text-muted-foreground">
                      Alt {customer.alternatePhone}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{customer.totalOrders}</td>
                <td className="px-4 py-3 font-semibold">{formatInr(customer.totalSpent)}</td>
                <td className="px-4 py-3 capitalize">{customer.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(customer.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
            {!customers.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No customers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
