import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { WHITELIST_ORIGINS } from "./constants";
import { globalLimiter } from "./config/rateLimiter";
import requestID from "./middlewares/requestID.middleware";
import { swaggerSpec } from "./config/swagger";
import "./config/passport";

const app = express();

// middleware
app.use(requestID);

// Add request-level timeouts
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Configure Helmet with strict security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
    xssFilter: true,
  }),
);
app.use(
  cors({
    origin: WHITELIST_ORIGINS,
    credentials: true,
  }),
);

// Enable response compression to reduce payload size and improve performance
app.use(
  compression({
    threshold: 1024,
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

app.use(globalLimiter);

// Custom routes
import healthCheckRouter from "./routes/healthCheck.routes";
import authRouter from "./routes/auth.routes";
import contextRouter from "./routes/context.routes";
import ritualRouter from "./routes/ritual.routes";
import switchLogRouter from "./routes/switchLog.routes";
import analyticsRouter from "./routes/analytics.routes";
import globalErrorHandler from "./utils/globalErrorHandler";
import config from "./config/config";

app.use("/api/v1/healthCheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/contexts", contextRouter);
app.use("/api/v1/rituals", ritualRouter);
app.use("/api/v1/switch-logs", switchLogRouter);
app.use("/api/v1/analytics", analyticsRouter);

// Swagger API Documentation
if (config.NODE_ENV !== "production") {
  app.use(
    "/api/v1/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Context Switcher API Docs",
    }),
  );
  app.get("/api/v1/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

// 404 catch-all route - must be after all valid routes
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    data: null,
  });
});

app.use(globalErrorHandler);

export default app;
