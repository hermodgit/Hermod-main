import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { db, developerApiKeysTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function formatKey(k: typeof developerApiKeysTable.$inferSelect) {
  return {
    id: k.id,
    label: k.label,
    prefix: k.prefix,
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  };
}

// GET /api/developer/keys
router.get("/developer/keys", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const keys = await db.select().from(developerApiKeysTable)
    .where(and(eq(developerApiKeysTable.userId, userId), eq(developerApiKeysTable.isActive, true)));
  res.json(keys.map(formatKey));
});

// POST /api/developer/keys
router.post("/developer/keys", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { label } = req.body;

  if (!label || typeof label !== "string") {
    res.status(400).json({ error: "label is required" });
    return;
  }

  const rawKey = `hmd_${randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  const hashedKey = hashKey(rawKey);

  const [key] = await db.insert(developerApiKeysTable).values({
    userId,
    label,
    prefix,
    hashedKey,
    isActive: true,
  }).returning();

  res.status(201).json({
    id: key.id,
    label: key.label,
    prefix: key.prefix,
    key: rawKey, // shown only once
    isActive: key.isActive,
    createdAt: key.createdAt.toISOString(),
  });
});

// DELETE /api/developer/keys/:id
router.delete("/developer/keys/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [revoked] = await db.update(developerApiKeysTable)
    .set({ isActive: false })
    .where(and(eq(developerApiKeysTable.id, rawId), eq(developerApiKeysTable.userId, userId)))
    .returning();

  if (!revoked) {
    res.status(404).json({ error: "API key not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
