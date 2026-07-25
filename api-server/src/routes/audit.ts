import { Router, type IRouter } from "express";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

function formatLog(log: typeof auditLogsTable.$inferSelect) {
  return {
    id: log.id,
    userId: log.userId,
    agentId: log.agentId,
    walletAddress: log.walletAddress,
    eventType: log.eventType,
    eventData: log.eventData,
    transactionHash: log.transactionHash,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  };
}

// GET /api/audit
router.get("/audit", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [eq(auditLogsTable.userId, userId)];

  if (req.query.eventType && typeof req.query.eventType === "string") {
    conditions.push(eq(auditLogsTable.eventType, req.query.eventType));
  }
  if (req.query.walletAddress && typeof req.query.walletAddress === "string") {
    conditions.push(eq(auditLogsTable.walletAddress, req.query.walletAddress));
  }
  if (req.query.agentId && typeof req.query.agentId === "string") {
    conditions.push(eq(auditLogsTable.agentId, req.query.agentId));
  }
  if (req.query.status && typeof req.query.status === "string") {
    conditions.push(eq(auditLogsTable.status, req.query.status));
  }

  const [logs, totalResult] = await Promise.all([
    db.select().from(auditLogsTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(auditLogsTable).where(and(...conditions)),
  ]);

  res.json({
    items: logs.map(formatLog),
    total: totalResult[0]?.count ?? 0,
  });
});

// POST /api/audit
router.post("/audit", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { agentId, walletAddress, eventType, eventData, transactionHash, status } = req.body;

  if (!eventType || typeof eventType !== "string") {
    res.status(400).json({ error: "eventType is required" });
    return;
  }

  const [log] = await db.insert(auditLogsTable).values({
    userId,
    agentId: agentId ?? null,
    walletAddress: walletAddress ?? null,
    eventType,
    eventData: eventData ?? null,
    transactionHash: transactionHash ?? null,
    status: status ?? null,
  }).returning();

  res.status(201).json(formatLog(log));
});

export default router;
