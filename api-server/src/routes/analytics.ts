import { Router, type IRouter } from "express";
import { sql, gte, and, eq, inArray } from "drizzle-orm";
import { db, transactionPlansTable, financialAgentsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

/** Parse ?range=7d|30d|90d into a cutoff Date */
function parseCutoff(range?: string): Date {
  const now = new Date();
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  now.setDate(now.getDate() - days);
  now.setHours(0, 0, 0, 0);
  return now;
}

// ── GET /api/analytics/overview ───────────────────────────────────
// KPI totals for the selected time range
router.get("/analytics/overview", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const cutoff = parseCutoff(req.query.range as string);

  const [stats] = await db
    .select({
      total:     sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${transactionPlansTable.status} = 'confirmed')::int`,
      failed:    sql<number>`count(*) filter (where ${transactionPlansTable.status} = 'failed')::int`,
      highRisk:  sql<number>`count(*) filter (where ${transactionPlansTable.riskLevel} in ('high','critical'))::int`,
      totalVolume: sql<string>`coalesce(sum(case when ${transactionPlansTable.amount} ~ '^[0-9.]+$' then ${transactionPlansTable.amount}::numeric else 0 end), 0)::text`,
      totalGas:  sql<string>`coalesce(sum(case when ${transactionPlansTable.estimatedGas} ~ '^[0-9]+$' then ${transactionPlansTable.estimatedGas}::numeric else 0 end), 0)::text`,
    })
    .from(transactionPlansTable)
    .where(and(
      eq(transactionPlansTable.userId, userId),
      gte(transactionPlansTable.createdAt, cutoff),
    ));

  const total = Number(stats.total ?? 0);
  const confirmed = Number(stats.confirmed ?? 0);

  // Most active agent (by tx count in range)
  const [topAgent] = await db
    .select({
      agentId: transactionPlansTable.agentId,
      txCount: sql<number>`count(*)::int`,
    })
    .from(transactionPlansTable)
    .where(and(
      eq(transactionPlansTable.userId, userId),
      gte(transactionPlansTable.createdAt, cutoff),
      sql`${transactionPlansTable.agentId} is not null`,
    ))
    .groupBy(transactionPlansTable.agentId)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  let mostActiveAgentName = "None";
  if (topAgent?.agentId) {
    const [agent] = await db.select({ name: financialAgentsTable.name }).from(financialAgentsTable)
      .where(eq(financialAgentsTable.id, topAgent.agentId));
    if (agent) mostActiveAgentName = agent.name;
  }

  res.json({
    totalTransactions: total,
    successRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    totalVolume: parseFloat(stats.totalVolume ?? "0").toFixed(2),
    totalGas: stats.totalGas ?? "0",
    highRiskIncidents: Number(stats.highRisk ?? 0),
    mostActiveAgent: mostActiveAgentName,
    mostActiveAgentTxCount: topAgent?.txCount ?? 0,
    failedTransactions: Number(stats.failed ?? 0),
  });
});

// ── GET /api/analytics/volume ─────────────────────────────────────
// Daily tx count + USD volume, grouped by date
router.get("/analytics/volume", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const cutoff = parseCutoff(req.query.range as string);

  const rows = await db
    .select({
      date:    sql<string>`date_trunc('day', ${transactionPlansTable.createdAt})::date::text`,
      total:   sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${transactionPlansTable.status} = 'confirmed')::int`,
      failed:  sql<number>`count(*) filter (where ${transactionPlansTable.status} = 'failed')::int`,
      volume:  sql<string>`coalesce(sum(case when ${transactionPlansTable.amount} ~ '^[0-9.]+$' then ${transactionPlansTable.amount}::numeric else 0 end), 0)::text`,
    })
    .from(transactionPlansTable)
    .where(and(
      eq(transactionPlansTable.userId, userId),
      gte(transactionPlansTable.createdAt, cutoff),
    ))
    .groupBy(sql`date_trunc('day', ${transactionPlansTable.createdAt})::date`)
    .orderBy(sql`date_trunc('day', ${transactionPlansTable.createdAt})::date asc`);

  res.json(rows.map(r => ({
    date: r.date,
    total: Number(r.total),
    confirmed: Number(r.confirmed),
    failed: Number(r.failed),
    volume: parseFloat(r.volume ?? "0"),
  })));
});

// ── GET /api/analytics/agents ─────────────────────────────────────
// Per-agent success rate, volume, risk incidents
router.get("/analytics/agents", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const cutoff = parseCutoff(req.query.range as string);

  const rows = await db
    .select({
      agentId:   transactionPlansTable.agentId,
      total:     sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${transactionPlansTable.status} = 'confirmed')::int`,
      failed:    sql<number>`count(*) filter (where ${transactionPlansTable.status} = 'failed')::int`,
      highRisk:  sql<number>`count(*) filter (where ${transactionPlansTable.riskLevel} in ('high','critical'))::int`,
      volume:    sql<string>`coalesce(sum(case when ${transactionPlansTable.amount} ~ '^[0-9.]+$' then ${transactionPlansTable.amount}::numeric else 0 end), 0)::text`,
    })
    .from(transactionPlansTable)
    .where(and(
      eq(transactionPlansTable.userId, userId),
      gte(transactionPlansTable.createdAt, cutoff),
    ))
    .groupBy(transactionPlansTable.agentId)
    .orderBy(sql`count(*) desc`);

  // Resolve agent names
  const agentIds = rows.map(r => r.agentId).filter(Boolean) as string[];
  const agents = agentIds.length > 0
    ? await db.select({ id: financialAgentsTable.id, name: financialAgentsTable.name })
        .from(financialAgentsTable)
        .where(inArray(financialAgentsTable.id, agentIds))
    : [];
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a.name]));

  res.json(rows.map(r => {
    const total = Number(r.total);
    const confirmed = Number(r.confirmed);
    return {
      agentId: r.agentId,
      agentName: r.agentId ? (agentMap[r.agentId] ?? `Agent ${r.agentId.slice(0,8)}`) : "No Agent (Direct)",
      total,
      confirmed,
      failed: Number(r.failed),
      highRiskIncidents: Number(r.highRisk),
      successRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      volume: parseFloat(r.volume ?? "0"),
    };
  }));
});

// ── GET /api/analytics/protocols ─────────────────────────────────
// Tx count grouped by actionType + risk level breakdown
router.get("/analytics/protocols", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const cutoff = parseCutoff(req.query.range as string);

  const [byAction, byRisk] = await Promise.all([
    db.select({
      actionType: transactionPlansTable.actionType,
      count: sql<number>`count(*)::int`,
    })
    .from(transactionPlansTable)
    .where(and(eq(transactionPlansTable.userId, userId), gte(transactionPlansTable.createdAt, cutoff)))
    .groupBy(transactionPlansTable.actionType)
    .orderBy(sql`count(*) desc`),

    db.select({
      riskLevel: transactionPlansTable.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(transactionPlansTable)
    .where(and(eq(transactionPlansTable.userId, userId), gte(transactionPlansTable.createdAt, cutoff)))
    .groupBy(transactionPlansTable.riskLevel)
    .orderBy(sql`count(*) desc`),
  ]);

  res.json({
    byActionType: byAction.map(r => ({ name: r.actionType.replace(/_/g, " "), value: Number(r.count), raw: r.actionType })),
    byRiskLevel: byRisk.map(r => ({ name: r.riskLevel ?? "unknown", value: Number(r.count) })),
  });
});

export default router;
