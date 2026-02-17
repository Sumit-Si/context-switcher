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
        "http://localhost:3000",
        "http://localhost:3001"
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


export default app;