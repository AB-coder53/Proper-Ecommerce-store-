"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerAddress, CustomerPublic } from "@/lib/commerce-types";

export default function AccountSettingsPage() {
  const { customer, loading, openAuth, refreshSession } = useCommerce();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/settings" });
  }, [customer, loading, openAuth]);

  useEffect(() => {
    if (!customer) return;
    setFullName(customer.fullName);
    setPhone(customer.phone);
    setAlternatePhone(customer.alternatePhone ?? "");
    void (async () => {
      const res = await fetch("/api/customer/addresses");
      if (!res.ok) return;
      const data = (await res.json()) as { addresses: CustomerAddress[] };
      setAddresses(data.addresses);
    })();
  }, [customer]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, alternatePhone }),
      });
      const data = (await res.json()) as { customer?: CustomerPublic; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not save profile");
        return;
      }
      await refreshSession();
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/customer/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Home",
        line1,
        line2,
        city,
        state,
        pincode,
        isDefault: true,
      }),
    });
    const data = (await res.json()) as { address?: CustomerAddress; error?: string };
    if (!res.ok) {
      toast.error(data.error || "Could not save address");
      return;
    }
    toast.success("Address saved");
    setLine1("");
    setLine2("");
    setCity("");
    setState("");
    setPincode("");
    const list = await fetch("/api/customer/addresses");
    const listData = (await list.json()) as { addresses: CustomerAddress[] };
    setAddresses(listData.addresses);
  };

  if (!customer) return <div className="min-h-[40vh]" />;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        Account settings
      </h1>

      <form onSubmit={saveProfile} className="mt-8 space-y-4 rounded-3xl border border-border p-6">
        <h2 className="font-display text-2xl font-bold">Profile</h2>
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 h-11 rounded-full"
            required
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={customer.email} disabled className="mt-1.5 h-11 rounded-full bg-muted" />
        </div>
        <div>
          <Label htmlFor="phone">Primary contact number</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 h-11 rounded-full"
            required
          />
        </div>
        <div>
          <Label htmlFor="alt">Alternate contact number</Label>
          <Input
            id="alt"
            value={alternatePhone}
            onChange={(e) => setAlternatePhone(e.target.value)}
            className="mt-1.5 h-11 rounded-full"
          />
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          Save profile
        </Button>
      </form>

      <div className="mt-8 rounded-3xl border border-border p-6">
        <h2 className="font-display text-2xl font-bold">Saved addresses</h2>
        <div className="mt-4 space-y-3">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-2xl border border-border p-4 text-sm">
              <p className="font-semibold">
                {address.label}
                {address.isDefault ? " · Default" : ""}
              </p>
              <p className="mt-1 text-muted-foreground">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={saveAddress} className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="a1">New address line 1</Label>
            <Input
              id="a1"
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="a2">Address line 2</Label>
            <Input
              id="a2"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          <div>
            <Label htmlFor="pin">PIN code</Label>
            <Input
              id="pin"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-ink text-xs tracking-[0.12em] text-ink-foreground uppercase"
            >
              Save address
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
