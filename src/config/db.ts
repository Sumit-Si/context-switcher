import mongoose from "mongoose";
import config from "../config/config";
import { DB_NAME } from "../constants";
import logger from "./logger";

const dbConnect = async () => {
  try {
    // Configure connection options with pooling
    const connectionOptions = {
      maxPoolSize: 10, // Maximum 10 connections in the pool
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if can't connect
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    logger.info("Connecting to MongoDB...", {
      meta: {
        maxPoolSize: connectionOptions.maxPoolSize,
        serverSelectionTimeoutMS: connectionOptions.serverSelectionTimeoutMS,
        socketTimeoutMS: connectionOptions.socketTimeoutMS,
      }
    });

    const connectionInstance = await mongoose.connect(
      `${config.MONGO_URI}/${DB_NAME}?authSource=admin`,
      connectionOptions
    );

    logger.info("MongoDB connection established", {
      meta: {
        host: connectionInstance.connection.host,
        database: connectionInstance.connection.name,
      }
    });

    const connection = connectionInstance.connection;

    // Add connection event handlers
    connection.on('connected', () => {
      logger.info("MongoDB connected event", {
        meta: { timestamp: new Date().toISOString() }
      });
    });

    connection.on('error', (error) => {
      logger.error("MongoDB connection error", {
        meta: { error, timestamp: new Date().toISOString() }
      });
    });

    connection.on('disconnected', () => {
      logger.warn("MongoDB disconnected", {
        meta: { timestamp: new Date().toISOString() }
      });
    });

    return { connection };
  } catch (error) {
    logger.error("MongoDB connection failed - Application startup aborted", {
      meta: { error, timestamp: new Date().toISOString() }
    });
    process.exit(1);
  }
};

export default dbConnect;
