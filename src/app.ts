import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { WHITELIST_ORIGINS } from "./constants";
import { globalLimiter } from "./config/rateLimiter";
import "./config/passport";

const app = express();

// middleware
app.use(helmet()); // secures your Express app by setting HTTP security headers
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
import globalErrorHandler from "./utils/globalErrorHandler";

app.use("/api/v1/healthCheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/contexts", contextRouter);

app.use(globalErrorHandler);

export default app;
