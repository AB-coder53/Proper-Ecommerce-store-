"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check } from "lucide-react";
import { toast } from "sonner";

import {
  AdminDeleteButton,
  AdminEditLink,
  AdminIconActions,
  AdminList,
} from "@/components/admin/AdminList";
import { StatusPill, statusDotClass } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";
import { cn } from "@/lib/utils";

const CLOSED = ["cancelled", "failed", "returned"] as const;
const POLL_MS = 8000;

function OrderStatusMenu({
  order,
  busy,
  onChange,
}: {
  order: Order;
  busy: boolean;
  onChange: (order: Order, status: string) => void;
}) {
  const item = (value: string, closed = false) => {
    const current = value === order.orderStatus;
    return (
      <DropdownMenuItem
        key={value}
        disabled={current || busy}
        className={cn(closed && "text-destructive focus:text-destructive", "justify-between")}
        onClick={() => onChange(order, value)}
      >
        <span className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", statusDotClass(value))} />
          {ORDER_STATUS_LABELS[value] ?? value}
        </span>
        {current ? <Check className="size-4" /> : null}
      </DropdownMenuItem>
    );
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={`Change status for order ${order.orderNumber}`}
          title="Change status"
          disabled={busy}
        >
          <ArrowRightLeft className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Change status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDER_STATUSES.map((value) => item(value))}
        <DropdownMenuSeparator />
        {CLOSED.map((value) => item(value, true))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminOrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef<string | null>(null);
  busyRef.current = busyId;

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { orders?: Order[] };
    if (data.orders) setOrders(data.orders);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      if (timer != null) return;
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, POLL_MS);
    };
    const stop = () => {
      if (timer != null) window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    window.addEventListener("focus", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("focus", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const updateStatus = async (order: Order, orderStatus: string) => {
    if (orderStatus === order.orderStatus) return;
    if (CLOSED.includes(orderStatus as (typeof CLOSED)[number])) {
      const label = ORDER_STATUS_LABELS[orderStatus] ?? orderStatus;
      if (
        !window.confirm(
          `Mark order #${order.orderNumber} as ${label}? The customer will see this, and reserved stock may be released.`,
        )
      ) {
        return;
      }
    }
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus,
          paymentStatus: order.paymentStatus,
          trackingNumber: order.trackingNumber ?? "",
          carrier: order.carrier ?? "",
          trackingUrl: order.trackingUrl ?? "",
        }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        toast.error(data.error || "Could not update order status.");
        return;
      }
      setOrders((current) => current.map((row) => (row.id === data.order!.id ? data.order! : row)));
      toast.success(
        `Order #${data.order.orderNumber} is now ${ORDER_STATUS_LABELS[data.order.orderStatus] ?? data.order.orderStatus}. Customers see this immediately.`,
      );
    } catch {
      toast.error("Could not update order status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminList
      rows={orders}
      rowKey={(order) => order.id}
      placeholder="Search orders"
      empty="No orders yet."
      getSearchText={(order) =>
        `${order.orderNumber} ${order.customerName} ${order.customerEmail} ${order.customerPhone} ${order.orderStatus} ${order.paymentStatus}`
      }
      footer={
        <>
          Changing status here updates the customer account and tracking page within a few seconds.
          <Button asChild variant="ghost" className="ml-2 h-8 rounded-full px-3 text-xs">
            <Link href="/admin/orders">Refresh list</Link>
          </Button>
        </>
      }
      columns={[
        {
          header: "Order",
          cell: (order) => (
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-medium text-teal hover:underline"
            >
              #{order.orderNumber}
            </Link>
          ),
        },
        {
          header: "Customer",
          cell: (order) => (
            <div>
              <div className="font-medium">{order.customerName}</div>
              <div className="break-all text-xs text-muted-foreground">{order.customerEmail}</div>
              <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
            </div>
          ),
        },
        {
          header: "Items",
          cell: (order) =>
            order.items.length
              ? `${order.items.reduce((sum, item) => sum + item.quantity, 0)} pcs`
              : "—",
        },
        {
          header: "Total",
          cell: (order) => <span className="font-semibold">{formatInr(order.totalAmount)}</span>,
        },
        {
          header: "Payment",
          cell: (order) => (
            <StatusPill status={order.paymentStatus}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </StatusPill>
          ),
        },
        {
          header: "Status",
          cell: (order) => (
            <StatusPill status={order.orderStatus}>
              {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
            </StatusPill>
          ),
        },
        {
          header: "Date",
          cell: (order) => (
            <span className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleString("en-IN")}
            </span>
          ),
        },
        {
          header: "Actions",
          className: "w-32 text-right",
          cell: (order) => (
            <AdminIconActions>
              <OrderStatusMenu
                order={order}
                busy={busyId === order.id}
                onChange={(row, status) => void updateStatus(row, status)}
              />
              <AdminEditLink href={`/admin/orders/${order.id}`} />
              <AdminDeleteButton
                disabled={busyId === order.id}
                onClick={async () => {
                  if (!window.confirm("Delete this item permanently?")) return;
                  const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
                  const data = (await res.json()) as { error?: string };
                  if (!res.ok) {
                    toast.error(data.error || "Could not delete order.");
                    return;
                  }
                  setOrders((current) => current.filter((row) => row.id !== order.id));
                  toast.success(`Order #${order.orderNumber} deleted.`);
                  router.refresh();
                }}
              />
            </AdminIconActions>
          ),
        },
      ]}
    />
  );
}
