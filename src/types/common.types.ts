import { Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  username: string;
  email: string;
};

export type GetRequestPayloads = {
  page?: string,
  limit?: string,
  sortBy?: string,
  order?: string,
  search?: string,
}
