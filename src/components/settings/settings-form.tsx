"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCircle, Home, Loader2, Shield } from "lucide-react";
import { DEFAULT_HOUSEHOLD_SETTINGS, type HouseholdSettings } from "@/types";

interface SettingsFormProps {
  name: string;
  currency: string;
  locale: string;
  settings: HouseholdSettings;
}

interface PreferenceRow {
  key: keyof HouseholdSettings;
  label: string;
  description: string;
}

const PERMISSION_ROWS: PreferenceRow[] = [
  {
    key: "autoCreateRecords",
    label: "Auto-create records",
    description: "Allow AI to create entities from documents",
  },
  {
    key: "proactiveReminders",
    label: "Proactive reminders",
    description: "AI will create reminders for upcoming deadlines",
  },
  {
    key: "externalActions",
    label: "External actions",
    description: "Allow AI to send emails and contact providers",
  },
];

const NOTIFICATION_ROWS: PreferenceRow[] = [
  {
    key: "weeklyBrief",
    label: "Weekly Life Brief",
    description: "Receive a weekly summary of your life admin",
  },
  {
    key: "deadlineAlerts",
    label: "Deadline alerts",
    description: "Get notified about upcoming deadlines",
  },
];

const ALL_ROWS = [...PERMISSION_ROWS, ...NOTIFICATION_ROWS];

export function SettingsForm({
  name,
  currency,
  locale,
  settings,
}: SettingsFormProps) {
  const router = useRouter();
  const baseline = { ...DEFAULT_HOUSEHOLD_SETTINGS, ...settings };

  const [form, setForm] = useState({ name, currency, locale });
  const [prefs, setPrefs] = useState<HouseholdSettings>(baseline);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    form.name !== name ||
    form.currency !== currency ||
    form.locale !== locale ||
    ALL_ROWS.some(
      (row) => Boolean(prefs[row.key]) !== Boolean(baseline[row.key])
    );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toggle(key: keyof HouseholdSettings, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          currency: form.currency.trim().toUpperCase(),
          locale: form.locale.trim(),
          settings: prefs,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not save settings");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save settings");
    } finally {
      setIsSaving(false);
    }
  }

  function renderRows(rows: PreferenceRow[]) {
    return rows.map((row, index) => (
      <div key={row.key}>
        {index > 0 && <Separator />}
        <div className="flex items-start justify-between gap-4 py-3">
          <div>
            <Label htmlFor={`pref-${row.key}`}>{row.label}</Label>
            <p className="text-sm text-muted-foreground">{row.description}</p>
          </div>
          <Checkbox
            id={`pref-${row.key}`}
            checked={Boolean(prefs[row.key])}
            onCheckedChange={(checked) => toggle(row.key, checked === true)}
            className="mt-0.5"
          />
        </div>
      </div>
    ));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home aria-hidden className="h-5 w-5" />
            Household
          </CardTitle>
          <CardDescription>
            Shared by everyone in this household
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="household-name">Household Name</Label>
            <Input
              id="household-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="My Household"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => update("currency", e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Three-letter ISO code, e.g. USD or VND.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={form.locale}
                onChange={(e) => update("locale", e.target.value)}
                placeholder="en-US"
              />
              <p className="text-xs text-muted-foreground">
                Controls date and number formatting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield aria-hidden className="h-5 w-5" />
            Permissions &amp; Automation
          </CardTitle>
          <CardDescription>
            Control what the AI is allowed to do on your behalf
          </CardDescription>
        </CardHeader>
        <CardContent>{renderRows(PERMISSION_ROWS)}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell aria-hidden className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent>{renderRows(NOTIFICATION_ROWS)}</CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving || !dirty}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
        {saved && (
          <span
            role="status"
            className="flex items-center gap-1 text-sm text-success-muted-foreground"
          >
            <CheckCircle aria-hidden className="h-4 w-4" />
            Saved
          </span>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!dirty && !saved && !error && (
          <p className="text-sm text-muted-foreground">
            No unsaved changes.
          </p>
        )}
      </div>
    </div>
  );
}
