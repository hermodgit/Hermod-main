import { Router, type IRouter } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { checkPolicy } from "../lib/policy-engine";
import { db, financialAgentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";

const router: IRouter = Router();

/**
 * POST /api/policy/check
 *
 * Check whether a proposed transaction is permitted by the user's agent policies.
 * If no agentId is provided, the user's first active agent is used.
 * If the user has no active agents, the transaction is always permitted (direct user action).
 */
router.post("/policy/check", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { agentId, actionType, tokenAddress, tokenSymbol, amount, recipientAddress, protocol } = req.body;

  if (!actionType || typeof actionType !== "string") {
    res.status(400).json({ error: "actionType is required" });
    return;
  }

  try {
    // Specific agent supplied
    if (agentId && typeof agentId === "string") {
      const result = await checkPolicy({
        agentId,
        userId,
        actionType,
        tokenAddress: tokenAddress ?? null,
        tokenSymbol: tokenSymbol ?? null,
        amount: amount ?? null,
        recipientAddress: recipientAddress ?? null,
        protocol: protocol ?? null,
      });
      res.json({ ...result, agentId });
      return;
    }

    // No agentId — find first active agent for this user
    const agents = await db
      .select()
      .from(financialAgentsTable)
      .where(
        and(
          eq(financialAgentsTable.userId, userId),
          eq(financialAgentsTable.isActive, true),
        ),
      )
      .limit(1);

    if (!agents.length) {
      // Direct user action, no agent policy applies
      res.json({
        allowed:          true,
        requiresApproval: false,
        reason:           "Direct action — no active agent policy applies",
        triggeredRules:   [],
        noAgent:          true,
      });
      return;
    }

    const result = await checkPolicy({
      agentId:          agents[0].id,
      userId,
      actionType,
      tokenAddress:     tokenAddress ?? null,
      tokenSymbol:      tokenSymbol ?? null,
      amount:           amount ?? null,
      recipientAddress: recipientAddress ?? null,
      protocol:         protocol ?? null,
    });

    res.json({ ...result, agentId: agents[0].id, agentName: agents[0].name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Policy check failed: ${message}` });
  }
});

export default router;
