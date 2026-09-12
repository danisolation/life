"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ENTITY_TYPE_CONFIG } from "@/types";
import { EmptyState } from "@/components/layout/empty-state";
import Link from "next/link";

interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
  createdAt: Date;
}

interface EntityListProps {
  entities: Entity[];
}

export function EntityList({ entities }: EntityListProps) {
  if (entities.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState title="No entities of this type" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entities.map((entity) => {
        const config = ENTITY_TYPE_CONFIG[entity.type as keyof typeof ENTITY_TYPE_CONFIG];
        return (
          <Link key={entity.id} href={`/life/${entity.type}/${entity.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    {config && (
                      <config.icon
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                    )}
                    <span className="truncate text-sm font-medium">{entity.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {config?.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
