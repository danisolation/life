import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities, entityRelations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";
import { EntityList } from "@/components/entities/entity-list";
import { EntityCreateDialog } from "@/components/entities/entity-create-dialog";
import { ArchivedEntities } from "@/components/entities/archived-entities";
import { requireAuth } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Network } from "lucide-react";

export default async function LifePage() {
  const session = await requireAuth();

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Life Admin Graph</h1>
        <p className="text-muted-foreground">Setting up your household...</p>
      </div>
    );
  }

  const allEntities = await db.query.entities.findMany({
    where: (ent, { and, eq, isNull }) =>
      and(eq(ent.householdId, membership.householdId), isNull(ent.archivedAt)),
    orderBy: (ent, { desc }) => [desc(ent.createdAt)],
  });

  const archivedEntities = await db.query.entities.findMany({
    where: (ent, { and, eq, isNotNull }) =>
      and(eq(ent.householdId, membership.householdId), isNotNull(ent.archivedAt)),
    orderBy: (ent, { desc }) => [desc(ent.archivedAt)],
    limit: 50,
  });

  const archived = archivedEntities.map((e) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    archivedAt: e.archivedAt ? e.archivedAt.toISOString() : e.createdAt.toISOString(),
  }));

  // Cast attributes to Record<string, unknown> for type safety
  const typedEntities = allEntities.map((e) => ({
    ...e,
    attributes: e.attributes as Record<string, unknown>,
  }));

  // Group entities by type
  const groupedEntities = typedEntities.reduce(
    (acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type].push(entity);
      return acc;
    },
    {} as Record<string, typeof typedEntities>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Life Admin Graph"
        description="Browse and manage all your life admin entities and their relationships."
        action={<EntityCreateDialog />}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groupedEntities).map(([type, items]) => {
          const config = ENTITY_TYPE_CONFIG[type as EntityType];
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                {config && (
                  <config.icon aria-hidden className="h-4 w-4 text-muted-foreground" />
                )}
                <h2 className="font-semibold">{config?.label || type}</h2>
                <span className="text-sm text-muted-foreground">
                  ({items.length})
                </span>
              </div>
              <EntityList entities={items} />
            </div>
          );
        })}
      </div>

      {allEntities.length === 0 && archived.length === 0 && (
        <EmptyState
          icon={Network}
          title="No entities yet"
          description="Upload documents to your Inbox to start building your Life Admin Graph."
          action={<Button render={<Link href="/inbox" />}>Go to Inbox</Button>}
        />
      )}

      <ArchivedEntities entities={archived} />
    </div>
  );
}
