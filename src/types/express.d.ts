import { UserDocument } from "./common.types";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument | null;
    }
  }
}
