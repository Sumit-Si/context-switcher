import { Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  username: string;
  email: string;
};
