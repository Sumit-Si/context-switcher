import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

const app = express();

// middleware
app.use(helmet());  // secures your Express app by setting HTTP security headers
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    credentials: true,
}));

// Enable response compression to reduce payload size and improve performance
app.use(compression({
    threshold: 1024,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// Custom routes
import healthCheckRouter from "./routes/healthCheck.routes";
import globalErrorHandler from "./utils/globalErrorHandler";

app.use("/api/v1/heathCheck", healthCheckRouter);

app.use(globalErrorHandler);

export default app;