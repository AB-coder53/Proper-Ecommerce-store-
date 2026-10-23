"use client";

import Link from "next/link";

import { AdminIconActions, AdminList, AdminViewLink } from "@/components/admin/AdminList";
import { StatusPill } from "@/components/admin/StatusPill";
import type { CustomerAdminRow } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";

export function CustomersTable({ customers }: { customers: CustomerAdminRow[] }) {
  return (
    <AdminList
      rows={customers}
      rowKey={(customer) => customer.id}
      placeholder="Search customers"
      empty="No customers yet."
      getSearchText={(customer) =>
        `${customer.fullName} ${customer.email} ${customer.phone} ${customer.status}`
      }
      columns={[
        {
          header: "Customer",
          cell: (customer) => (
            <div>
              <Link
                href={`/admin/customers/${customer.id}`}
                className="font-medium text-teal hover:underline"
              >
                {customer.fullName}
              </Link>
              <div className="text-xs text-muted-foreground">{customer.email}</div>
            </div>
          ),
        },
        {
          header: "Phone",
          cell: (customer) => (
            <div>
              {customer.phone}
              {customer.alternatePhone ? (
                <div className="text-xs text-muted-foreground">Alt {customer.alternatePhone}</div>
              ) : null}
            </div>
          ),
        },
        { header: "Orders", cell: (customer) => customer.totalOrders },
        {
          header: "Spent",
          cell: (customer) => (
            <span className="font-semibold">{formatInr(customer.totalSpent)}</span>
          ),
        },
        {
          header: "Status",
          cell: (customer) => <StatusPill status={customer.status}>{customer.status}</StatusPill>,
        },
        {
          header: "Joined",
          cell: (customer) => new Date(customer.createdAt).toLocaleDateString("en-IN"),
        },
        {
          header: "Actions",
          className: "w-16 text-right",
          cell: (customer) => (
            <AdminIconActions>
              <AdminViewLink href={`/admin/customers/${customer.id}`} />
            </AdminIconActions>
          ),
        },
      ]}
    />
  );
}
