import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, transactionPlansTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { writeAuditLog } from "../lib/audit-helper";
import type { Request, Response } from "express";

const router: IRouter = Router();

function formatTx(tx: typeof transactionPlansTable.$inferSelect) {
  return {
    id: tx.id,
    userId: tx.userId,
    agentId: tx.agentId,
    walletAddress: tx.walletAddress,
    chainId: tx.chainId,
    actionType: tx.actionType,
    targetContract: tx.targetContract,
    recipientAddress: tx.recipientAddress,
    tokenAddress: tx.tokenAddress,
    tokenSymbol: tx.tokenSymbol,
    amount: tx.amount,
    calldata: tx.calldata,
    estimatedGas: tx.estimatedGas,
    riskLevel: tx.riskLevel,
    riskWarnings: tx.riskWarnings,
    policyResult: tx.policyResult,
    status: tx.status,
    transactionHash: tx.transactionHash,
    explorerUrl: tx.explorerUrl,
    notes: tx.notes,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

// GET /api/transactions
router.get("/transactions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const conditions = [eq(transactionPlansTable.userId, userId)];

  if (req.query.status && typeof req.query.status === "string") {
    conditions.push(eq(transactionPlansTable.status, req.query.status));
  }
  if (req.query.agentId && typeof req.query.agentId === "string") {
    conditions.push(eq(transactionPlansTable.agentId, req.query.agentId));
  }

  const txs = await db.select().from(transactionPlansTable)
    .where(and(...conditions))
    .orderBy(desc(transactionPlansTable.createdAt))
    .limit(100);

  res.json(txs.map(formatTx));
});

// POST /api/transactions
router.post("/transactions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const {
    agentId, walletAddress, chainId, actionType,
    targetContract, recipientAddress, tokenAddress, tokenSymbol,
    amount, calldata, estimatedGas, riskLevel, riskWarnings, notes,
  } = req.body;

  if (!walletAddress || typeof walletAddress !== "string") {
    res.status(400).json({ error: "walletAddress is required" });
    return;
  }
  if (!chainId || typeof chainId !== "number") {
    res.status(400).json({ error: "chainId is required and must be a number" });
    return;
  }
  if (!actionType || typeof actionType !== "string") {
    res.status(400).json({ error: "actionType is required" });
    return;
  }

  const [tx] = await db.insert(transactionPlansTable).values({
    userId,
    agentId: agentId ?? null,
    walletAddress,
    chainId,
    actionType,
    targetContract: targetContract ?? null,
    recipientAddress: recipientAddress ?? null,
    tokenAddress: tokenAddress ?? null,
    tokenSymbol: tokenSymbol ?? null,
    amount: amount ?? null,
    calldata: calldata ?? null,
    estimatedGas: estimatedGas ?? null,
    riskLevel: riskLevel ?? "low",
    riskWarnings: riskWarnings ?? [],
    status: "draft",
    notes: notes ?? null,
  }).returning();

  void writeAuditLog({
    userId,
    walletAddress,
    eventType: "transaction_plan_created",
    eventData: { txId: tx.id, actionType, chainId },
    status: "draft",
  });

  res.status(201).json(formatTx(tx));
});

// GET /api/transactions/:id
router.get("/transactions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [tx] = await db.select().from(transactionPlansTable)
    .where(and(eq(transactionPlansTable.id, rawId), eq(transactionPlansTable.userId, userId)));

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(formatTx(tx));
});

// PATCH /api/transactions/:id
router.patch("/transactions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, transactionHash, explorerUrl, notes } = req.body;

  // Validate ownership first
  const [existing] = await db.select({ id: transactionPlansTable.id, walletAddress: transactionPlansTable.walletAddress })
    .from(transactionPlansTable)
    .where(and(eq(transactionPlansTable.id, rawId), eq(transactionPlansTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (transactionHash !== undefined) updateData.transactionHash = transactionHash;
  if (explorerUrl !== undefined) updateData.explorerUrl = explorerUrl;
  if (notes !== undefined) updateData.notes = notes;

  const [tx] = await db.update(transactionPlansTable)
    .set(updateData)
    .where(and(eq(transactionPlansTable.id, rawId), eq(transactionPlansTable.userId, userId)))
    .returning();

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Write audit log for status transitions
  if (status) {
    void writeAuditLog({
      userId,
      walletAddress: tx.walletAddress,
      eventType: `transaction_${status}`,
      eventData: { txId: tx.id, actionType: tx.actionType },
      transactionHash: transactionHash ?? null,
      status,
    });
  }

  res.json(formatTx(tx));
});

export default router;
