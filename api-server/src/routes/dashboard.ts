import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, walletsTable, financialAgentsTable, transactionPlansTable, auditLogsTable, riskReportsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

// GET /api/dashboard/summary
router.get("/dashboard/summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  // Run all queries in parallel
  const [
    walletCountResult,
    agentCountResult,
    pendingTxCountResult,
    riskAlertCountResult,
    recentAuditLogs,
  ] = await Promise.all([
    db.select({ count: count() }).from(walletsTable)
      .where(and(eq(walletsTable.userId, userId), eq(walletsTable.isActive, true))),
    db.select({ count: count() }).from(financialAgentsTable)
      .where(and(eq(financialAgentsTable.userId, userId), eq(financialAgentsTable.isActive, true))),
    db.select({ count: count() }).from(transactionPlansTable)
      .where(and(eq(transactionPlansTable.userId, userId), eq(transactionPlansTable.status, "pending_approval"))),
    db.select({ count: count() }).from(riskReportsTable)
      .where(and(eq(riskReportsTable.userId, userId), eq(riskReportsTable.riskLevel, "high"))),
    db.select().from(auditLogsTable)
      .where(eq(auditLogsTable.userId, userId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(5),
  ]);

  const formattedLogs = recentAuditLogs.map(log => ({
    id: log.id,
    userId: log.userId,
    agentId: log.agentId,
    walletAddress: log.walletAddress,
    eventType: log.eventType,
    eventData: log.eventData,
    transactionHash: log.transactionHash,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  }));

  res.json({
    walletCount: walletCountResult[0]?.count ?? 0,
    activeAgentCount: agentCountResult[0]?.count ?? 0,
    pendingTransactionCount: pendingTxCountResult[0]?.count ?? 0,
    riskAlertCount: riskAlertCountResult[0]?.count ?? 0,
    recentAuditLogs: formattedLogs,
  });
});

export default router;
