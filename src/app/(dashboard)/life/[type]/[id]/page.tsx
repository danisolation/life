import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EntityActions } from "@/components/entities/entity-actions";
import { EntityAttributesEditor } from "@/components/entities/entity-attributes-editor";
import { EntityRelationsManager } from "@/components/entities/entity-relations-manager";
import { EntityDocuments } from "@/components/entities/entity-documents";
import { ArrowLeft, FileText, Clock, Network, Info } from "lucide-react";
import { daysUntil, startOfToday } from "@/lib/deadline-urgency";

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    const iso = /^\d{4}-\d{2}-\d{2}(T|$)/;
    if (iso.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      }
    }
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) notFound();

  const entity = await db.query.entities.findFirst({
    where: (ent, { and, eq }) =>
      and(eq(ent.id, id), eq(ent.householdId, membership.householdId)),
    with: {
      outgoingRelations: { with: { toEntity: true } },
      incomingRelations: { with: { fromEntity: true } },
      documents: true,
      reminders: true,
    },
  });

  if (!entity) notFound();

  const today = startOfToday();

  const config = ENTITY_TYPE_CONFIG[entity.type as EntityType];
  const attributes = entity.attributes as Record<string, unknown>;
  const attrEntries = Object.entries(attributes).filter(([, v]) => v !== null && v !== undefined && v !== "");

  const sortedReminders = [...entity.reminders]
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime());

  return (
    <div className="space-y-6">
      <Link
        href="/life"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Life Graph
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {config && (
            <config.icon aria-hidden className="h-8 w-8 shrink-0 text-muted-foreground" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{entity.name}</h1>
              <Badge variant="secondary">{config?.label}</Badge>
              {entity.archivedAt && <Badge variant="outline">Archived</Badge>}
            </div>
            {entity.description && (
              <p className="text-muted-foreground mt-1">{entity.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Created {new Date(entity.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <EntityActions
          entityId={entity.id}
          entityType={entity.type}
          name={entity.name}
          description={entity.description}
          archived={Boolean(entity.archivedAt)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Details
              </CardTitle>
              <CardDescription>Extracted and confirmed attributes</CardDescription>
              <CardAction>
                <EntityAttributesEditor
                  entityId={entity.id}
                  attributes={attributes}
                />
              </CardAction>
            </CardHeader>
            <CardContent>
              {attrEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attributes recorded.</p>
              ) : (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {attrEntries.map(([key, value]) => (
                    <div key={key} className="rounded border p-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {formatKey(key)}
                      </dt>
                      <dd className="mt-1 text-sm break-words whitespace-pre-wrap">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Relationships
              </CardTitle>
              <CardDescription>How this connects to other items</CardDescription>
            </CardHeader>
            <CardContent>
              <EntityRelationsManager
                entityId={entity.id}
                outgoing={entity.outgoingRelations.map((r) => ({
                  id: r.id,
                  relationType: r.relationType,
                  entityId: r.toEntity.id,
                  entityType: r.toEntity.type,
                  entityName: r.toEntity.name,
                }))}
                incoming={entity.incomingRelations.map((r) => ({
                  id: r.id,
                  relationType: r.relationType,
                  entityId: r.fromEntity.id,
                  entityType: r.fromEntity.type,
                  entityName: r.fromEntity.name,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Deadlines
              </CardTitle>
              <CardDescription>
                {sortedReminders.length} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
              ) : (
                <div className="space-y-3">
                  {sortedReminders.map((r) => {
                    const days = daysUntil(r.triggerAt, today);
                    return (
                      <div key={r.id} className="rounded border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{r.title}</p>
                          <Badge
                            variant={days <= 7 ? "destructive" : days <= 30 ? "default" : "secondary"}
                          >
                            {days}d
                          </Badge>
                        </div>
                        {r.message && (
                          <p className="text-xs text-muted-foreground mt-1">{r.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(r.triggerAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>{entity.documents.length} attached</CardDescription>
            </CardHeader>
            <CardContent>
              <EntityDocuments
                entityId={entity.id}
                documents={entity.documents.map((doc) => ({
                  id: doc.id,
                  fileName: doc.fileName,
                  fileUrl: doc.fileUrl,
                  status: doc.status,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
