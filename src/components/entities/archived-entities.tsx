"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";

interface ArchivedEntity {
  id: string;
  type: string;
  name: string;
  archivedAt: string;
}

export function ArchivedEntities({ entities }: { entities: ArchivedEntity[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not restore that item");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not restore that item");
    } finally {
      setBusyId(null);
    }
  }

  if (entities.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Archive aria-hidden className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Archived</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {entities.length}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-destructive bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        {entities.map((entity) => {
          const config = ENTITY_TYPE_CONFIG[entity.type as EntityType];
          const busy = busyId === entity.id;
          return (
            <Card key={entity.id}>
              <CardContent className="flex items-center justify-between gap-4 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  {config && (
                    <config.icon
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                  )}
                  <Link
                    href={`/life/${entity.type}/${entity.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {entity.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    archived{" "}
                    {new Date(entity.archivedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restore(entity.id)}
                  disabled={busy}
                  aria-label={`Restore ${entity.name}`}
                >
                  {busy ? (
                    <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw aria-hidden className="mr-1 h-3 w-3" />
                      Restore
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
