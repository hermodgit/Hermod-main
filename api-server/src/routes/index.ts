import { Router, type IRouter } from "express";
import healthRouter from "./health";
import walletsRouter from "./wallets";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import portfolioRouter from "./portfolio";
import riskRouter from "./risk";
import approvalsRouter from "./approvals";
import transactionsRouter from "./transactions";
import agentsRouter from "./agents";
import recurringRouter from "./recurring";
import auditRouter from "./audit";
import developerRouter from "./developer";
import aiRouter from "./ai";
import swapRouter from "./swap";
import policyRouter from "./policy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(walletsRouter);
router.use(settingsRouter);
router.use(dashboardRouter);
router.use(portfolioRouter);
router.use(riskRouter);
router.use(approvalsRouter);
router.use(transactionsRouter);
router.use(agentsRouter);
router.use(recurringRouter);
router.use(auditRouter);
router.use(developerRouter);
router.use(aiRouter);
router.use(swapRouter);
router.use(policyRouter);

export default router;
