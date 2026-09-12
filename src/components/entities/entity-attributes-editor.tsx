"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";

interface AttrRow {
  key: string;
  value: string;
}

interface EntityAttributesEditorProps {
  entityId: string;
  attributes: Record<string, unknown>;
}

function toInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "") return "";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  const num = Number(trimmed);
  return isNaN(num) ? trimmed : num;
}

export function EntityAttributesEditor({
  entityId,
  attributes,
}: EntityAttributesEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttrRow[]>([]);

  function loadRows() {
    setRows(
      Object.entries(attributes).map(([key, value]) => ({
        key,
        value: toInput(value),
      }))
    );
    setError(null);
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (!key) continue;
      payload[key] = parseValue(row.value);
    }
    // Keys removed from the editor are sent as null so the API deletes them
    for (const key of Object.keys(attributes)) {
      if (!Object.hasOwn(payload, key)) payload[key] = null;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save attributes");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save attributes");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) loadRows();
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit attributes</DialogTitle>
          <DialogDescription>
            Values are stored as text, numbers, booleans, or JSON. Removing a field
            deletes it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Fields</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRows((r) => [...r, { key: "", value: "" }])}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add field
            </Button>
          </div>

          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">No attributes yet.</p>
          )}

          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="field"
                value={row.key}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                  )
                }
                className="flex-1"
              />
              <Input
                placeholder="value"
                value={row.value}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                  )
                }
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                aria-label="Remove field"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
