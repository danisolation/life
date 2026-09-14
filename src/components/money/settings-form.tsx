"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COMMON_CURRENCIES = ["VND", "USD", "EUR", "JPY", "KRW", "GBP", "AUD", "SGD"];

export function SettingsForm({
  user,
  hasTransactions,
}: {
  user: { name: string; email: string; currency: string; locale: string };
  hasTransactions: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency);
  const [locale, setLocale] = useState(user.locale);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved">("idle");

  const currencies = COMMON_CURRENCIES.includes(currency)
    ? COMMON_CURRENCIES
    : [currency, ...COMMON_CURRENCIES];
  const mismatch = confirm.length > 0 && confirm !== next;

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileStatus("saving");
    setProfileError(null);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, locale, ...(hasTransactions ? {} : { currency }) }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setProfileError(data?.error ?? "Something went wrong");
      setProfileStatus("idle");
      return;
    }

    setProfileStatus("saved");
    router.refresh();
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (mismatch) return;
    setPasswordStatus("saving");
    setPasswordError(null);

    const response = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setPasswordError(data?.error ?? "Something went wrong");
      setPasswordStatus("idle");
      return;
    }

    setPasswordStatus("saved");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name, currency and locale.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={user.email} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-currency">Currency</Label>
              <select
                id="settings-currency"
                disabled={hasTransactions}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              {hasTransactions && (
                <p className="text-xs text-muted-foreground">
                  Locked because you already have transactions. Delete them all to change it — the
                  existing amounts would otherwise be read in the wrong currency.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-locale">Locale</Label>
              <Input
                id="settings-locale"
                placeholder="vi-VN"
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              />
            </div>
            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={profileStatus === "saving" || !name.trim()}>
                {profileStatus === "saving" ? "Saving…" : "Save"}
              </Button>
              {profileStatus === "saved" && (
                <span className="text-sm text-muted-foreground">Saved</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>At least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-current">Current password</Label>
              <Input
                id="settings-current"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-next">New password</Label>
              <Input
                id="settings-next"
                type="password"
                autoComplete="new-password"
                required
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-confirm">Confirm new password</Label>
              <Input
                id="settings-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
              {mismatch && <p className="text-sm text-muted-foreground">Passwords do not match.</p>}
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={passwordStatus === "saving" || mismatch || !current || next.length < 8}
              >
                {passwordStatus === "saving" ? "Updating…" : "Update password"}
              </Button>
              {passwordStatus === "saved" && (
                <span className="text-sm text-muted-foreground">Password updated</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
