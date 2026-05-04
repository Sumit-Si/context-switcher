import { Types } from "mongoose";
import { AuthProvider } from "./auth.types";

export type UserDocument = {
  _id: Types.ObjectId;
  username: string;
  email: string;
  avatar?: string;
  avatarPublicId?: string;
  authProvider: AuthProvider;
};

export type GetRequestPayloads = {
  page?: string,
  limit?: string,
  sortBy?: string,
  order?: string,
  search?: string,
}
