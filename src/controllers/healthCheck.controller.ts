import { Request, Response } from "express";
import { getApplicationHealth, getSystemHealth } from "../utils/quicker";

const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    statusCode: 200,
    message: "All Ok!",
    application: getApplicationHealth(),
    system: getSystemHealth(),
    timestamp: Date.now(),
  });
};

export { healthCheck };
