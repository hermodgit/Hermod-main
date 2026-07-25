import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import rateLimit from "express-rate-limit";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk proxy — must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Build allowlist of trusted origins:
// - CORS_ORIGIN env var (comma-separated list for explicit overrides)
// - REPLIT_DOMAINS (space-separated list injected by the Replit platform)
// - REPLIT_DEV_DOMAIN (injected in dev environments)
// Unknown origins are denied; credentialed requests are only allowed from listed origins.
const rawAllowedOrigins: string[] = [];
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(",").forEach((o) => rawAllowedOrigins.push(o.trim()));
}
if (process.env.REPLIT_DOMAINS) {
  process.env.REPLIT_DOMAINS.split(" ").forEach((d) => {
    rawAllowedOrigins.push(`https://${d.trim()}`);
  });
}
if (process.env.REPLIT_DEV_DOMAIN) {
  rawAllowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN.trim()}`);
}
// Allow localhost variants only in development (never in production)
if (process.env.NODE_ENV !== "production") {
  rawAllowedOrigins.push("http://localhost:23751", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:80");
}
const allowedOrigins = new Set(rawAllowedOrigins.filter(Boolean));

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk auth middleware — resolves publishable key from request host
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

app.use("/api", router);

export default app;
