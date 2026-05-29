import app from "./app";
import config from "./config/config";
import dbConnect from "./config/db";
import logger from "./config/logger";
import { initRateLimiter } from "./config/rateLimiter";
import mongoose from "mongoose";
import type { Server } from "http";

const PORT = config.PORT;
let server: Server;

// Graceful shutdown function
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received`, {
    meta: { timestamp: new Date().toISOString() },
  });

  logger.info("Starting graceful shutdown...", {
    meta: { timestamp: new Date().toISOString() },
  });

  // Set timeout for forced exit (10 seconds)
  const forceExitTimeout = setTimeout(() => {
    logger.error("Forced shutdown - timeout exceeded", {
      meta: { timestamp: new Date().toISOString() },
    });
    process.exit(1);
  }, 10000);

  try {
    // Stop accepting new requests
    if (server) {
      logger.info("Closing HTTP server...", {
        meta: { timestamp: new Date().toISOString() },
      });

      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error("Error closing HTTP server", {
              meta: { error: err, timestamp: new Date().toISOString() },
            });
            reject(err);
          } else {
            logger.info("HTTP server closed", {
              meta: { timestamp: new Date().toISOString() },
            });
            resolve();
          }
        });
      });
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      logger.info("Closing MongoDB connection...", {
        meta: { timestamp: new Date().toISOString() },
      });

      await mongoose.connection.close();

      logger.info("MongoDB connection closed", {
        meta: { timestamp: new Date().toISOString() },
      });
    }

    clearTimeout(forceExitTimeout);
    logger.info("Graceful shutdown completed", {
      meta: { timestamp: new Date().toISOString() },
    });
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimeout);
    logger.error("Error during graceful shutdown", {
      meta: { error, timestamp: new Date().toISOString() },
    });
    process.exit(1);
  }
};

// Register signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    meta: { error, timestamp: new Date().toISOString() },
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", {
    meta: { reason, timestamp: new Date().toISOString() },
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

dbConnect()
  .then(({ connection }) => {
    server = app.listen(PORT, () => {
      logger.info("DB_CONNECTED ✅", {
        meta: {
          CONNECTION_NAME: connection.name,
        },
      });

      initRateLimiter(connection);
      logger.info("RATE_LIMITER_INITIALIZED ✅");

      logger.info("SERVER_STARTED", {
        meta: {
          PORT: config.PORT,
          SERVER_URL: config.SERVER_URL,
        },
      });
    });
  })
  .catch((error) => {
    logger.error("SERVER_DB_CONNECTION_ERROR", {
      meta: error,
    });
    process.exit(1);
  });
