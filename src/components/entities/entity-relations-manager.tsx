"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Loader2, ArrowRight } from "lucide-react";
import { ENTITY_TYPE_CONFIG, type EntityType, type RelationType } from "@/types";

interface RelatedItem {
  id: string;
  relationType: string;
  entityId: string;
  entityType: string;
  entityName: string;
}

interface EntityRelationsManagerProps {
  entityId: string;
  outgoing: RelatedItem[];
  incoming: RelatedItem[];
}

const RELATION_LABELS: Record<RelationType, string> = {
  HAS_WARRANTY: "has warranty",
  HAS_RECEIPT: "has receipt",
  PAID_BY: "paid by",
  PROVIDED_BY: "provided by",
  BELONGS_TO: "belongs to",
  REMINDER_FOR: "reminder for",
  DEPENDS_ON: "depends on",
  EXTENDS: "extends",
  CANCELS: "cancels",
};

interface EntityOption {
  id: string;
  type: string;
  name: string;
}

export function EntityRelationsManager({
  entityId,
  outgoing,
  incoming,
}: EntityRelationsManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ toEntityId: "", relationType: "HAS_WARRANTY" });

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetch("/api/entities")
      .then((r) => r.json())
      .then((data) => {
        setEntities(
          (data.entities || []).filter((e: EntityOption) => e.id !== entityId)
        );
      })
      .catch(() => setError("Could not load entities"))
      .finally(() => setIsLoading(false));
  }, [open, entityId]);

  async function handleAdd() {
    if (!form.toEntityId) {
      setError("Pick an entity to link");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/entity-relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEntityId: entityId,
          toEntityId: form.toEntityId,
          relationType: form.relationType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create relation");
        return;
      }
      setOpen(false);
      setForm({ toEntityId: "", relationType: "HAS_WARRANTY" });
      router.refresh();
    } catch {
      setError("Could not create relation");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(relationId: string) {
    const res = await fetch(`/api/entity-relations?id=${relationId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const hasAny = outgoing.length > 0 || incoming.length > 0;

  return (
    <div className="space-y-4">
      {!hasAny && (
        <p className="text-sm text-muted-foreground">
          No relationships yet. Link this item to related records.
        </p>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-2">
          {outgoing.map((rel) => (
            <div key={rel.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <Badge variant="outline" className="shrink-0">
                {RELATION_LABELS[rel.relationType as RelationType] || rel.relationType}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Link
                href={`/life/${rel.entityType}/${rel.entityId}`}
                className="flex items-center gap-1 truncate hover:underline"
              >
                <span>{ENTITY_TYPE_CONFIG[rel.entityType as EntityType]?.icon}</span>
                <span className="truncate">{rel.entityName}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6 shrink-0"
                onClick={() => handleRemove(rel.id)}
                aria-label="Remove relation"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Linked from
          </p>
          {incoming.map((rel) => (
            <div key={rel.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <Link
                href={`/life/${rel.entityType}/${rel.entityId}`}
                className="flex items-center gap-1 truncate hover:underline"
              >
                <span>{ENTITY_TYPE_CONFIG[rel.entityType as EntityType]?.icon}</span>
                <span className="truncate">{rel.entityName}</span>
              </Link>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="shrink-0">
                {RELATION_LABELS[rel.relationType as RelationType] || rel.relationType}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6 shrink-0"
                onClick={() => handleRemove(rel.id)}
                aria-label="Remove relation"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add relationship
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add relationship</DialogTitle>
            <DialogDescription>
              Link this item to another record in your Life Graph.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="relation-type">Relationship</Label>
              <Select
                value={form.relationType}
                onValueChange={(v) => setForm((f) => ({ ...f, relationType: v ?? f.relationType }))}
              >
                <SelectTrigger id="relation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RELATION_LABELS) as RelationType[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {RELATION_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-entity">Link to</Label>
              <Select
                value={form.toEntityId}
                onValueChange={(v) => setForm((f) => ({ ...f, toEntityId: v ?? "" }))}
              >
                <SelectTrigger id="target-entity">
                  <SelectValue placeholder={isLoading ? "Loading..." : "Select an entity"} />
                </SelectTrigger>
                <SelectContent>
                  {entities.length === 0 && !isLoading ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No other entities yet
                    </div>
                  ) : (
                    entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {ENTITY_TYPE_CONFIG[e.type as EntityType]?.icon} {e.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving || !form.toEntityId}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
