import { Request, Response } from "express";

const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    statusCode: 200,
    message: "All Ok!",
  });
};

export { healthCheck };
