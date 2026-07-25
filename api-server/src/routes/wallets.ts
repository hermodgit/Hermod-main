import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, walletsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

// GET /api/wallets
router.get("/wallets", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const wallets = await db
    .select()
    .from(walletsTable)
    .where(and(eq(walletsTable.userId, userId), eq(walletsTable.isActive, true)));
  res.json(wallets.map(w => ({
    id: w.id,
    address: w.address,
    chainId: w.chainId,
    chainName: w.chainName,
    label: w.label,
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
  })));
});

// POST /api/wallets
router.post("/wallets", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { address, chainId, chainName, label } = req.body;

  if (!address || typeof address !== "string") {
    res.status(400).json({ error: "address is required" });
    return;
  }
  if (!chainId || typeof chainId !== "number") {
    res.status(400).json({ error: "chainId is required and must be a number" });
    return;
  }

  // Upsert: if wallet already exists for this user, return it
  const existing = await db
    .select()
    .from(walletsTable)
    .where(and(
      eq(walletsTable.userId, userId),
      eq(walletsTable.address, address.toLowerCase()),
      eq(walletsTable.chainId, chainId),
    ));

  if (existing.length > 0) {
    const w = existing[0];
    res.status(200).json({
      id: w.id,
      address: w.address,
      chainId: w.chainId,
      chainName: w.chainName,
      label: w.label,
      isActive: w.isActive,
      createdAt: w.createdAt.toISOString(),
    });
    return;
  }

  const [wallet] = await db.insert(walletsTable).values({
    userId,
    address: address.toLowerCase(),
    chainId,
    chainName: chainName ?? null,
    label: label ?? null,
    isActive: true,
  }).returning();

  res.status(201).json({
    id: wallet.id,
    address: wallet.address,
    chainId: wallet.chainId,
    chainName: wallet.chainName,
    label: wallet.label,
    isActive: wallet.isActive,
    createdAt: wallet.createdAt.toISOString(),
  });
});

// DELETE /api/wallets/:id
router.delete("/wallets/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [wallet] = await db
    .update(walletsTable)
    .set({ isActive: false })
    .where(and(eq(walletsTable.id, rawId), eq(walletsTable.userId, userId)))
    .returning();

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
