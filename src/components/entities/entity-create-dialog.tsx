"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";

const ENTITY_TYPES = Object.keys(ENTITY_TYPE_CONFIG) as EntityType[];

interface AttrRow {
  key: string;
  value: string;
}

export function EntityCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<EntityType>("asset");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [attrs, setAttrs] = useState<AttrRow[]>([]);

  function reset() {
    setType("asset");
    setName("");
    setDescription("");
    setAttrs([]);
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const attributes: Record<string, unknown> = {};
    for (const row of attrs) {
      const key = row.key.trim();
      if (!key) continue;
      const raw = row.value.trim();
      const num = Number(raw);
      attributes[key] = raw !== "" && !isNaN(num) ? num : raw;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          description: description.trim() || null,
          attributes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create entity");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Could not create entity");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Item
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add item to Life Graph</DialogTitle>
          <DialogDescription>
            Create an item manually. You can edit it and add relationships afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
              <SelectTrigger id="new-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ENTITY_TYPE_CONFIG[t].icon} {ENTITY_TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home internet contract"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-description">Description</Label>
            <Textarea
              id="new-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attributes</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAttrs((a) => [...a, { key: "", value: "" }])}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add field
              </Button>
            </div>
            {attrs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Optional. Add fields like expiryDate, amount, provider, returnDeadline.
              </p>
            )}
            {attrs.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="field"
                  value={row.key}
                  onChange={(e) =>
                    setAttrs((a) => a.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))
                  }
                  className="flex-1"
                />
                <Input
                  placeholder="value"
                  value={row.value}
                  onChange={(e) =>
                    setAttrs((a) => a.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttrs((a) => a.filter((_, j) => j !== i))}
                  aria-label="Remove field"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
