import { Request, Response } from "express";
import mongoose from "mongoose";
import { getApplicationHealth, getSystemHealth } from "../utils/quicker";
import { DB_NAME } from "../constants";

const healthCheck = (req: Request, res: Response) => {
  // Check MongoDB connection status
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbStatus = dbStatusMap[dbState] || 'unknown';

  const isHealthy = dbState === 1;

  // If database is not connected, return 503
  if (!isHealthy) {
    return res.status(503).json({
      statusCode: 503,
      message: "Service Unavailable - Database not connected",
      database: {
        status: dbStatus,
        name: DB_NAME,
      },
      application: getApplicationHealth(),
      system: getSystemHealth(),
      timestamp: new Date().toISOString(),
    });
  }

  // Return 200 with all health metrics
  res.status(200).json({
    statusCode: 200,
    message: "All Ok!",
    database: {
      status: dbStatus,
      name: DB_NAME,
    },
    application: getApplicationHealth(),
    system: getSystemHealth(),
    timestamp: new Date().toISOString(),
  });
};

export { healthCheck };
