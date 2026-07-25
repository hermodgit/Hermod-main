/**
 * Policy Engine
 * Validates a proposed transaction against the agent's policy before approval.
 * Returns a structured result with pass/fail per rule.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  financialAgentsTable,
  agentPoliciesTable,
  agentAllowedTokensTable,
  agentAllowedProtocolsTable,
  agentBlockedAddressesTable,
  agentAllowedRecipientsTable,
  transactionPlansTable,
} from "@workspace/db";
import { writeAuditLog } from "./audit-helper";

export interface PolicyCheckInput {
  agentId: string;
  userId: string;
  actionType: string;
  tokenAddress?: string | null;
  tokenSymbol?: string | null;
  protocol?: string | null;
  amount?: string | null; // decimal string e.g. "100.5"
  recipientAddress?: string | null;
  slippage?: string | null; // e.g. "0.5" for 0.5%
}

export interface PolicyRule {
  rule: string;
  passed: boolean;
  reason: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  triggeredRules: PolicyRule[];
}

export async function checkPolicy(input: PolicyCheckInput): Promise<PolicyCheckResult> {
  const rules: PolicyRule[] = [];

  // ── Load agent ─────────────────────────────────────────────────────────────
  const [agent] = await db.select().from(financialAgentsTable)
    .where(and(eq(financialAgentsTable.id, input.agentId), eq(financialAgentsTable.userId, input.userId)));

  if (!agent) {
    return { allowed: false, requiresApproval: false, reason: "Agent not found", triggeredRules: [{ rule: "agent_exists", passed: false, reason: "Agent not found" }] };
  }

  // Rule 1: Agent must be active
  rules.push({ rule: "agent_active", passed: agent.isActive, reason: agent.isActive ? "Agent is active" : "Agent is disabled" });
  if (!agent.isActive) {
    await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "agent_active", input }, status: "blocked" });
    return { allowed: false, requiresApproval: false, reason: "Agent is disabled", triggeredRules: rules };
  }

  // ── Load policy ────────────────────────────────────────────────────────────
  const [policy] = await db.select().from(agentPoliciesTable).where(eq(agentPoliciesTable.agentId, input.agentId));

  if (!policy) {
    await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_passed", eventData: { note: "No policy configured — manual approval required", input }, status: "success" });
    return { allowed: true, requiresApproval: true, reason: "No policy configured — manual approval required", triggeredRules: rules };
  }

  // Rule 2: Blocked address check
  if (input.recipientAddress) {
    const blocked = await db.select().from(agentBlockedAddressesTable).where(eq(agentBlockedAddressesTable.agentId, input.agentId));
    if (blocked.length > 0) {
      const isBlocked = blocked.some(b => b.address.toLowerCase() === input.recipientAddress!.toLowerCase());
      rules.push({ rule: "blocked_address", passed: !isBlocked, reason: isBlocked ? `Recipient ${input.recipientAddress} is on the blocked list` : "Recipient is not blocked" });
      if (isBlocked) {
        await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "blocked_address", recipientAddress: input.recipientAddress }, status: "blocked" });
        return { allowed: false, requiresApproval: false, reason: `Recipient address ${input.recipientAddress} is blocked by this agent's policy`, triggeredRules: rules };
      }
    } else {
      rules.push({ rule: "blocked_address", passed: true, reason: "No blocked addresses configured" });
    }
  }

  // Rule 3: Allowed recipient check
  if (input.recipientAddress) {
    const allowedRecipients = await db.select().from(agentAllowedRecipientsTable).where(eq(agentAllowedRecipientsTable.agentId, input.agentId));
    if (allowedRecipients.length > 0) {
      const recipientAllowed = allowedRecipients.some(r => r.address.toLowerCase() === input.recipientAddress!.toLowerCase());
      rules.push({ rule: "recipient_allowed", passed: recipientAllowed, reason: recipientAllowed ? `Recipient ${input.recipientAddress} is in the allowed list` : `Recipient ${input.recipientAddress} is not in the allowed list` });
      if (!recipientAllowed) {
        await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "recipient_allowed", recipientAddress: input.recipientAddress }, status: "blocked" });
        return { allowed: false, requiresApproval: false, reason: `Recipient ${input.recipientAddress} is not in this agent's allowed recipient list`, triggeredRules: rules };
      }
    } else {
      rules.push({ rule: "recipient_allowed", passed: true, reason: "No recipient restrictions configured" });
    }
  }

  // Rule 4: Token allowed
  if (input.tokenAddress) {
    const allowedTokens = await db.select().from(agentAllowedTokensTable).where(eq(agentAllowedTokensTable.agentId, input.agentId));
    if (allowedTokens.length > 0) {
      const tokenAllowed = allowedTokens.some(t => t.tokenAddress.toLowerCase() === input.tokenAddress!.toLowerCase());
      rules.push({ rule: "token_allowed", passed: tokenAllowed, reason: tokenAllowed ? `Token ${input.tokenAddress} is in the allowed list` : `Token ${input.tokenAddress} is not in the allowed list` });
      if (!tokenAllowed) {
        await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "token_allowed", input }, status: "blocked" });
        return { allowed: false, requiresApproval: false, reason: `Token ${input.tokenSymbol || input.tokenAddress} is not permitted by this agent's policy`, triggeredRules: rules };
      }
    } else {
      rules.push({ rule: "token_allowed", passed: true, reason: "No token restrictions configured" });
    }
  }

  // Rule 5: Protocol allowed
  if (input.protocol) {
    const allowedProtocols = await db.select().from(agentAllowedProtocolsTable).where(eq(agentAllowedProtocolsTable.agentId, input.agentId));
    if (allowedProtocols.length > 0) {
      const protocolAllowed = allowedProtocols.some(p => p.protocol.toLowerCase() === input.protocol!.toLowerCase());
      rules.push({ rule: "protocol_allowed", passed: protocolAllowed, reason: protocolAllowed ? `Protocol ${input.protocol} is in the allowed list` : `Protocol ${input.protocol} is not in the allowed list` });
      if (!protocolAllowed) {
        await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "protocol_allowed", input }, status: "blocked" });
        return { allowed: false, requiresApproval: false, reason: `Protocol ${input.protocol} is not permitted by this agent's policy`, triggeredRules: rules };
      }
    } else {
      rules.push({ rule: "protocol_allowed", passed: true, reason: "No protocol restrictions configured" });
    }
  }

  // Rule 6: Max transaction amount
  if (policy.maxTransactionAmount && input.amount) {
    const amount = parseFloat(input.amount);
    const maxAmount = parseFloat(policy.maxTransactionAmount);
    const withinLimit = !isNaN(amount) && !isNaN(maxAmount) && amount <= maxAmount;
    rules.push({ rule: "max_transaction_amount", passed: withinLimit, reason: withinLimit ? `Amount ${input.amount} is within limit of ${policy.maxTransactionAmount}` : `Amount ${input.amount} exceeds limit of ${policy.maxTransactionAmount}` });
    if (!withinLimit) {
      await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "max_transaction_amount", amount: input.amount, max: policy.maxTransactionAmount }, status: "blocked" });
      return { allowed: false, requiresApproval: false, reason: `Transaction amount ${input.amount} exceeds the policy limit of ${policy.maxTransactionAmount}`, triggeredRules: rules };
    }
  } else {
    rules.push({ rule: "max_transaction_amount", passed: true, reason: "No transaction amount limit configured" });
  }

  // Rule 7: Daily transaction count limit
  if (policy.dailyTransactionLimit) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(transactionPlansTable)
      .where(and(eq(transactionPlansTable.userId, input.userId), eq(transactionPlansTable.agentId, input.agentId), gte(transactionPlansTable.createdAt, startOfDay)));
    const todayCount = countResult?.count ?? 0;
    const withinDailyLimit = todayCount < policy.dailyTransactionLimit;
    rules.push({ rule: "daily_transaction_limit", passed: withinDailyLimit, reason: withinDailyLimit ? `Daily count ${todayCount}/${policy.dailyTransactionLimit}` : `Daily limit of ${policy.dailyTransactionLimit} reached (${todayCount} today)` });
    if (!withinDailyLimit) {
      await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "daily_transaction_limit", todayCount, limit: policy.dailyTransactionLimit }, status: "blocked" });
      return { allowed: false, requiresApproval: false, reason: `Daily transaction limit of ${policy.dailyTransactionLimit} reached`, triggeredRules: rules };
    }
  } else {
    rules.push({ rule: "daily_transaction_limit", passed: true, reason: "No daily transaction limit configured" });
  }

  // Rule 8: Max daily spend (sum of amounts for same token symbol today)
  if (policy.maxDailySpend && input.amount && input.tokenSymbol) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todayTxns = await db.select({ amount: transactionPlansTable.amount })
      .from(transactionPlansTable)
      .where(and(
        eq(transactionPlansTable.userId, input.userId),
        eq(transactionPlansTable.agentId, input.agentId),
        eq(transactionPlansTable.tokenSymbol, input.tokenSymbol),
        gte(transactionPlansTable.createdAt, startOfDay),
      ));

    const todaySpend = todayTxns.reduce((sum, t) => sum + parseFloat(t.amount ?? "0"), 0);
    const thisAmount = parseFloat(input.amount);
    const maxSpend = parseFloat(policy.maxDailySpend);
    const withinSpendLimit = !isNaN(todaySpend) && !isNaN(thisAmount) && !isNaN(maxSpend) && (todaySpend + thisAmount) <= maxSpend;

    rules.push({ rule: "max_daily_spend", passed: withinSpendLimit, reason: withinSpendLimit ? `Daily spend ${(todaySpend + thisAmount).toFixed(4)} ${input.tokenSymbol} within limit of ${policy.maxDailySpend}` : `Daily spend limit of ${policy.maxDailySpend} ${input.tokenSymbol} would be exceeded (current: ${todaySpend.toFixed(4)})` });
    if (!withinSpendLimit) {
      await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "max_daily_spend", todaySpend, amount: input.amount, max: policy.maxDailySpend, token: input.tokenSymbol }, status: "blocked" });
      return { allowed: false, requiresApproval: false, reason: `This transaction would exceed the daily spend limit of ${policy.maxDailySpend} ${input.tokenSymbol}`, triggeredRules: rules };
    }
  } else {
    rules.push({ rule: "max_daily_spend", passed: true, reason: "No daily spend limit configured" });
  }

  // Rule 9: Max slippage
  if (policy.maxSlippage && input.slippage) {
    const slippage = parseFloat(input.slippage);
    const maxSlippage = parseFloat(policy.maxSlippage);
    const withinSlippage = !isNaN(slippage) && !isNaN(maxSlippage) && slippage <= maxSlippage;
    rules.push({ rule: "max_slippage", passed: withinSlippage, reason: withinSlippage ? `Slippage ${slippage}% is within limit of ${policy.maxSlippage}%` : `Slippage ${slippage}% exceeds limit of ${policy.maxSlippage}%` });
    if (!withinSlippage) {
      await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_failed", eventData: { rule: "max_slippage", slippage: input.slippage, max: policy.maxSlippage }, status: "blocked" });
      return { allowed: false, requiresApproval: false, reason: `Slippage ${slippage}% exceeds the policy limit of ${policy.maxSlippage}%`, triggeredRules: rules };
    }
  } else {
    rules.push({ rule: "max_slippage", passed: true, reason: "No slippage limit configured" });
  }

  // Rule 10: Requires manual approval flag
  const requiresApproval = policy.requiresManualApproval ?? true;
  rules.push({ rule: "requires_manual_approval", passed: true, reason: requiresApproval ? "Policy requires manual approval" : "Automatic approval permitted by policy" });

  await writeAuditLog({ userId: input.userId, agentId: input.agentId, eventType: "policy_check_passed", eventData: { input, rules, requiresApproval }, status: "success" });

  return { allowed: true, requiresApproval, reason: requiresApproval ? "All policy checks passed — manual approval required" : "All policy checks passed — transaction approved", triggeredRules: rules };
}
