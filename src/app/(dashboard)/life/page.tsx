import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities, entityRelations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";
import { EntityList } from "@/components/entities/entity-list";
import { EntityTabs } from "@/components/entities/entity-tabs";
import { requireAuth } from "@/lib/session";

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
    where: (ent, { and, eq }) => and(eq(ent.householdId, membership.householdId)),
    orderBy: (ent, { desc }) => [desc(ent.createdAt)],
  });

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Life Admin Graph</h1>
        <p className="text-muted-foreground">
          Browse and manage all your life admin entities and their relationships.
        </p>
      </div>

      <EntityTabs />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groupedEntities).map(([type, items]) => {
          const config = ENTITY_TYPE_CONFIG[type as EntityType];
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{config?.icon}</span>
                <h2 className="font-semibold">{config?.label || type}</h2>
                <span className="text-sm text-muted-foreground">
                  ({items.length})
                </span>
              </div>
              <EntityList entities={items.slice(0, 5)} />
            </div>
          );
        })}
      </div>

      {allEntities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No entities yet. Upload documents to your Inbox to start building
            your Life Admin Graph.
          </p>
        </div>
      )}
    </div>
  );
}
