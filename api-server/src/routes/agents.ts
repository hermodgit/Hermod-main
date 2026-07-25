import { Router, type IRouter } from "express";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import {
  db,
  financialAgentsTable,
  agentPoliciesTable,
  agentAllowedTokensTable,
  agentAllowedProtocolsTable,
  agentBlockedAddressesTable,
  agentAllowedRecipientsTable,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

async function getAgentWithPolicy(agentId: string, userId: string) {
  const [agent] = await db.select().from(financialAgentsTable)
    .where(and(eq(financialAgentsTable.id, agentId), eq(financialAgentsTable.userId, userId)));
  if (!agent) return null;

  const [policy] = await db.select().from(agentPoliciesTable)
    .where(eq(agentPoliciesTable.agentId, agentId));
  const allowedTokens    = await db.select().from(agentAllowedTokensTable).where(eq(agentAllowedTokensTable.agentId, agentId));
  const allowedProtocols = await db.select().from(agentAllowedProtocolsTable).where(eq(agentAllowedProtocolsTable.agentId, agentId));
  const blockedAddresses = await db.select().from(agentBlockedAddressesTable).where(eq(agentBlockedAddressesTable.agentId, agentId));
  const allowedRecipients = await db.select().from(agentAllowedRecipientsTable).where(eq(agentAllowedRecipientsTable.agentId, agentId));

  return {
    id:            agent.id,
    userId:        agent.userId,
    name:          agent.name,
    description:   agent.description,
    agentType:     agent.agentType,
    walletAddress: agent.walletAddress,
    isActive:      agent.isActive,
    policy: policy ? {
      maxTransactionAmount: policy.maxTransactionAmount,
      maxDailySpend:        policy.maxDailySpend,
      dailyTransactionLimit: policy.dailyTransactionLimit,
      requiresManualApproval: policy.requiresManualApproval,
      maxSlippage:           policy.maxSlippage,
      allowedTokens:         allowedTokens.map(t => t.tokenAddress),
      allowedProtocols:      allowedProtocols.map(p => p.protocol),
      allowedRecipients:     allowedRecipients.map(r => r.address),
      blockedAddresses:      blockedAddresses.map(b => b.address),
    } : null,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

// ── Helpers for array policy fields ──────────────────────────────────────────
async function syncArrayTable<T extends { agentId: string }>(
  table: any,
  agentId: string,
  items: string[],
  mapper: (item: string) => T,
) {
  await db.delete(table).where(eq(table.agentId, agentId));
  if (items.length > 0) {
    await db.insert(table).values(items.map(mapper));
  }
}

// GET /api/agents
router.get("/agents", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const agents = await db.select().from(financialAgentsTable)
    .where(eq(financialAgentsTable.userId, userId))
    .orderBy(desc(financialAgentsTable.createdAt));

  res.json(agents.map(a => ({
    id: a.id, userId: a.userId, name: a.name, description: a.description,
    agentType: a.agentType, walletAddress: a.walletAddress, isActive: a.isActive,
    policy: null, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
  })));
});

// POST /api/agents
router.post("/agents", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { name, description, agentType, walletAddress, policy } = req.body;

  if (!name || typeof name !== "string") { res.status(400).json({ error: "name is required" }); return; }
  if (!agentType || typeof agentType !== "string") { res.status(400).json({ error: "agentType is required" }); return; }

  const [agent] = await db.insert(financialAgentsTable).values({
    userId, name, description: description ?? null, agentType, walletAddress: walletAddress ?? null, isActive: true,
  }).returning();

  if (policy) {
    await db.insert(agentPoliciesTable).values({
      agentId: agent.id,
      maxTransactionAmount: policy.maxTransactionAmount ?? null,
      maxDailySpend:        policy.maxDailySpend ?? null,
      dailyTransactionLimit: policy.dailyTransactionLimit ?? null,
      requiresManualApproval: policy.requiresManualApproval ?? true,
      maxSlippage:           policy.maxSlippage ?? null,
    });

    if (Array.isArray(policy.allowedTokens) && policy.allowedTokens.length > 0)
      await db.insert(agentAllowedTokensTable).values(policy.allowedTokens.map((t: string) => ({ agentId: agent.id, tokenAddress: t })));

    if (Array.isArray(policy.allowedProtocols) && policy.allowedProtocols.length > 0)
      await db.insert(agentAllowedProtocolsTable).values(policy.allowedProtocols.map((p: string) => ({ agentId: agent.id, protocol: p })));

    if (Array.isArray(policy.blockedAddresses) && policy.blockedAddresses.length > 0)
      await db.insert(agentBlockedAddressesTable).values(policy.blockedAddresses.map((a: string) => ({ agentId: agent.id, address: a })));

    if (Array.isArray(policy.allowedRecipients) && policy.allowedRecipients.length > 0)
      await db.insert(agentAllowedRecipientsTable).values(policy.allowedRecipients.map((a: string) => ({ agentId: agent.id, address: a })));
  }

  const result = await getAgentWithPolicy(agent.id, userId);
  res.status(201).json(result);
});

// GET /api/agents/:id
router.get("/agents/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const agent = await getAgentWithPolicy(rawId, userId);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json(agent);
});

// PATCH /api/agents/:id
router.patch("/agents/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, description, walletAddress, isActive, policy } = req.body;

  const [ownedAgent] = await db.select({ id: financialAgentsTable.id })
    .from(financialAgentsTable)
    .where(and(eq(financialAgentsTable.id, rawId), eq(financialAgentsTable.userId, userId)));

  if (!ownedAgent) { res.status(404).json({ error: "Agent not found" }); return; }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined)          updateData.name = name;
  if (description !== undefined)   updateData.description = description;
  if (walletAddress !== undefined) updateData.walletAddress = walletAddress;
  if (isActive !== undefined)      updateData.isActive = isActive;

  if (Object.keys(updateData).length > 0) {
    await db.update(financialAgentsTable).set(updateData)
      .where(and(eq(financialAgentsTable.id, rawId), eq(financialAgentsTable.userId, userId)));
  }

  if (policy) {
    const existing = await db.select().from(agentPoliciesTable).where(eq(agentPoliciesTable.agentId, rawId));
    const policyValues = {
      maxTransactionAmount: policy.maxTransactionAmount ?? null,
      maxDailySpend:        policy.maxDailySpend ?? null,
      dailyTransactionLimit: policy.dailyTransactionLimit ?? null,
      requiresManualApproval: policy.requiresManualApproval ?? true,
      maxSlippage:           policy.maxSlippage ?? null,
    };
    if (existing.length > 0) {
      await db.update(agentPoliciesTable).set(policyValues).where(eq(agentPoliciesTable.agentId, rawId));
    } else {
      await db.insert(agentPoliciesTable).values({ agentId: rawId, ...policyValues });
    }

    if (Array.isArray(policy.allowedTokens))
      await syncArrayTable(agentAllowedTokensTable, rawId, policy.allowedTokens, (t: string) => ({ agentId: rawId, tokenAddress: t }));

    if (Array.isArray(policy.allowedProtocols))
      await syncArrayTable(agentAllowedProtocolsTable, rawId, policy.allowedProtocols, (p: string) => ({ agentId: rawId, protocol: p }));

    if (Array.isArray(policy.blockedAddresses))
      await syncArrayTable(agentBlockedAddressesTable, rawId, policy.blockedAddresses, (a: string) => ({ agentId: rawId, address: a }));

    if (Array.isArray(policy.allowedRecipients))
      await syncArrayTable(agentAllowedRecipientsTable, rawId, policy.allowedRecipients, (a: string) => ({ agentId: rawId, address: a }));
  }

  const result = await getAgentWithPolicy(rawId, userId);
  if (!result) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json(result);
});

// DELETE /api/agents/:id
router.delete("/agents/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [deleted] = await db.delete(financialAgentsTable)
    .where(and(eq(financialAgentsTable.id, rawId), eq(financialAgentsTable.userId, userId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Agent not found" }); return; }
  res.sendStatus(204);
});

export default router;
