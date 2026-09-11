// Audit System - logs every AI action for transparency
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export interface AuditEntry {
  actor: string;
  action: string;
  targetEntity?: string;
  targetType?: string;
  reason?: string;
  source?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  householdId?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    actor: entry.actor,
    action: entry.action,
    targetEntity: entry.targetEntity,
    targetType: entry.targetType,
    reason: entry.reason,
    source: entry.source,
    confidence: entry.confidence ? Math.round(entry.confidence * 100) : undefined,
    metadata: entry.metadata || {},
    householdId: entry.householdId,
  });
}

export async function getAuditLogs(
  householdId: string,
  limit: number = 50
) {
  return db.query.auditLogs.findMany({
    where: (logs, { eq }) => eq(logs.householdId, householdId),
    orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    limit,
  });
}
