import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, recurringPlansTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

function formatPlan(p: typeof recurringPlansTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    agentId: p.agentId,
    walletAddress: p.walletAddress,
    chainId: p.chainId,
    recipientAddress: p.recipientAddress,
    tokenAddress: p.tokenAddress,
    tokenSymbol: p.tokenSymbol,
    amount: p.amount,
    frequency: p.frequency,
    startDate: p.startDate,
    endDate: p.endDate,
    maxExecutions: p.maxExecutions,
    executionCount: p.executionCount,
    status: p.status,
    nextExecutionAt: p.nextExecutionAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function computeNextExecution(startDate: string, frequency: string): Date {
  const start = new Date(startDate);
  const now = new Date();
  if (start > now) return start;
  const next = new Date(now);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

// GET /api/recurring
router.get("/recurring", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const plans = await db.select().from(recurringPlansTable)
    .where(eq(recurringPlansTable.userId, userId))
    .orderBy(desc(recurringPlansTable.createdAt));
  res.json(plans.map(formatPlan));
});

// POST /api/recurring
router.post("/recurring", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const {
    agentId, walletAddress, chainId, recipientAddress,
    tokenAddress, tokenSymbol, amount, frequency,
    startDate, endDate, maxExecutions,
  } = req.body;

  if (!walletAddress || !recipientAddress || !tokenSymbol || !amount || !frequency || !startDate || !chainId) {
    res.status(400).json({ error: "walletAddress, recipientAddress, tokenSymbol, amount, frequency, startDate, and chainId are required" });
    return;
  }

  const nextExecution = computeNextExecution(startDate, frequency);

  const [plan] = await db.insert(recurringPlansTable).values({
    userId,
    agentId: agentId ?? null,
    walletAddress,
    chainId,
    recipientAddress,
    tokenAddress: tokenAddress ?? null,
    tokenSymbol,
    amount,
    frequency,
    startDate,
    endDate: endDate ?? null,
    maxExecutions: maxExecutions ?? null,
    executionCount: 0,
    status: "active",
    nextExecutionAt: nextExecution,
  }).returning();

  res.status(201).json(formatPlan(plan));
});

// PATCH /api/recurring/:id
router.patch("/recurring/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body;

  const [plan] = await db.update(recurringPlansTable)
    .set({ status })
    .where(and(eq(recurringPlansTable.id, rawId), eq(recurringPlansTable.userId, userId)))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Recurring plan not found" });
    return;
  }
  res.json(formatPlan(plan));
});

// DELETE /api/recurring/:id
router.delete("/recurring/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [deleted] = await db.delete(recurringPlansTable)
    .where(and(eq(recurringPlansTable.id, rawId), eq(recurringPlansTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Recurring plan not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
