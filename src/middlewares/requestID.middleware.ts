import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

const requestID = (req: Request, res: Response, next: NextFunction) => {
  // Use existing ID from a reverse proxy (nginx, AWS load balancer) if available
  // Otherwise generate a new UUID for this request
  const id = (req.headers["x-request-id"] as string) ?? randomUUID();
  req.headers["x-request-id"] = id;

  // Send it back so frontend can include it in bug reports
  // When user reports "something went wrong", they give you this ID
  // and you search your logs: logger.info("...", { requestId: "abc-123" })
  res.setHeader("x-request-id", id);
  next();
};

export default requestID;