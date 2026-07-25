import { db, auditLogsTable } from "@workspace/db";

interface AuditEvent {
  userId: string;
  agentId?: string | null;
  walletAddress?: string | null;
  eventType: string;
  eventData?: Record<string, unknown> | null;
  transactionHash?: string | null;
  status?: string | null;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 * Call this at the end of every significant action.
 */
export async function writeAuditLog(event: AuditEvent): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: event.userId,
      agentId: event.agentId ?? null,
      walletAddress: event.walletAddress ?? null,
      eventType: event.eventType,
      eventData: event.eventData ?? null,
      transactionHash: event.transactionHash ?? null,
      status: event.status ?? null,
    });
  } catch {
    // Never let audit log writes crash the API
  }
}
