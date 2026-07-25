/**
 * Recurring Plan Scheduler
 * Runs on a 60-second interval, finds due recurring plans,
 * and creates transaction_plans records for each execution.
 *
 * Safety guarantees:
 *  1. In-process reentrancy guard — a second tick is a no-op if the previous one
 *     is still running.
 *  2. DB-level row claiming with FOR UPDATE SKIP LOCKED inside a transaction —
 *     each plan row is claimed atomically, so concurrent workers (or overlapping
 *     ticks in multi-instance deployments) cannot double-process the same plan.
 *  3. nextExecutionAt is advanced inside the same transaction as the
 *     transaction_plan insert, so the claim and the advance are atomic.
 */

import { and, eq, lte, sql } from "drizzle-orm";
import {
  db,
  recurringPlansTable,
  recurringExecutionsTable,
  transactionPlansTable,
} from "@workspace/db";
import { logger } from "./logger";

function computeNextExecutionAt(from: Date, frequency: string): Date {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * Process a single due plan inside its own DB transaction.
 * The plan row is locked with FOR UPDATE SKIP LOCKED so concurrent workers
 * skip it cleanly rather than racing on the same row.
 */
async function processPlan(planId: string, now: Date): Promise<void> {
  await db.transaction(async (tx) => {
    // Claim the row — SKIP LOCKED means concurrent workers move on rather than wait.
    const claimed = await tx.execute(sql`
      SELECT * FROM recurring_plans
      WHERE id = ${planId}::uuid
        AND status = 'active'
        AND next_execution_at <= ${now.toISOString()}
      FOR UPDATE SKIP LOCKED
    `);

    if (claimed.rows.length === 0) {
      // Another worker already claimed this row; skip silently.
      return;
    }

    const plan = claimed.rows[0] as {
      id: string;
      user_id: string;
      agent_id: string | null;
      wallet_address: string;
      chain_id: number;
      recipient_address: string;
      token_address: string | null;
      token_symbol: string;
      amount: string;
      frequency: string;
      end_date: string | null;
      max_executions: number | null;
      execution_count: number;
      next_execution_at: string;
      status: string;
    };

    // Check completion conditions inside the transaction so they are consistent.
    if (plan.max_executions !== null && plan.execution_count >= plan.max_executions) {
      await tx
        .update(recurringPlansTable)
        .set({ status: "completed" })
        .where(eq(recurringPlansTable.id, plan.id));
      logger.info({ planId: plan.id }, "Recurring plan completed — max executions reached");
      return;
    }

    if (plan.end_date && new Date(plan.end_date) < now) {
      await tx
        .update(recurringPlansTable)
        .set({ status: "completed" })
        .where(eq(recurringPlansTable.id, plan.id));
      logger.info({ planId: plan.id }, "Recurring plan completed — end date reached");
      return;
    }

    // Advance nextExecutionAt atomically before inserting the plan, so any crash
    // after this point does NOT cause a re-processing on the next tick.
    const nextAt = computeNextExecutionAt(new Date(plan.next_execution_at), plan.frequency);

    await tx
      .update(recurringPlansTable)
      .set({
        nextExecutionAt: nextAt,
        executionCount: plan.execution_count + 1,
      })
      .where(eq(recurringPlansTable.id, plan.id));

    // Create the transaction plan record (requires user wallet signature to execute).
    const [txPlan] = await tx
      .insert(transactionPlansTable)
      .values({
        userId: plan.user_id,
        agentId: plan.agent_id ?? null,
        walletAddress: plan.wallet_address,
        chainId: plan.chain_id,
        actionType: "send_token",
        recipientAddress: plan.recipient_address,
        tokenSymbol: plan.token_symbol ?? null,
        amount: plan.amount,
        status: "pending_approval",
        riskLevel: "low",
        riskWarnings: [],
        notes: `Recurring payment — plan ${plan.id}`,
      })
      .returning();

    // Log execution attempt inside the same transaction.
    await tx.insert(recurringExecutionsTable).values({
      recurringPlanId: plan.id,
      transactionPlanId: txPlan.id,
      status: "pending",
    });

    logger.info(
      { planId: plan.id, txPlanId: txPlan.id, nextAt },
      "Recurring plan execution created",
    );
  });
}

// In-process reentrancy guard: prevents a slow tick from overlapping with the next.
let tickInProgress = false;

async function runSchedulerTick(): Promise<void> {
  if (tickInProgress) {
    logger.warn("Scheduler: previous tick still running — skipping this tick");
    return;
  }

  tickInProgress = true;
  const now = new Date();

  try {
    // Identify due plan IDs first (lightweight read outside any transaction).
    const duePlans = await db
      .select({ id: recurringPlansTable.id })
      .from(recurringPlansTable)
      .where(
        and(
          eq(recurringPlansTable.status, "active"),
          lte(recurringPlansTable.nextExecutionAt, now),
        ),
      );

    if (duePlans.length === 0) return;

    logger.info({ count: duePlans.length }, "Scheduler: processing due recurring plans");

    // Process each plan in its own transaction so failures are isolated.
    for (const { id } of duePlans) {
      try {
        await processPlan(id, now);
      } catch (err) {
        logger.error({ err, planId: id }, "Error processing recurring plan");

        // Log the failed execution outside the failed transaction.
        await db.insert(recurringExecutionsTable).values({
          recurringPlanId: id,
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        }).catch((logErr) => {
          logger.error({ logErr, planId: id }, "Could not log failed execution");
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "Scheduler tick error");
  } finally {
    tickInProgress = false;
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerInterval) return; // already started

  // Run immediately on startup, then every 60 seconds.
  void runSchedulerTick();
  schedulerInterval = setInterval(() => {
    void runSchedulerTick();
  }, 60_000);

  logger.info("Recurring plan scheduler started (60s interval)");
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info("Recurring plan scheduler stopped");
  }
}
