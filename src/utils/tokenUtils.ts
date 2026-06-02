import type { Types } from "mongoose";
import { ApiError } from "./ApiError";
import User from "../models/user.model";
import crypto from "crypto";
import { AUTH_CONSTANTS } from "../constants";

const generateAccessAndRefreshToken = async (
  userId: Types.ObjectId | string,
) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new ApiError({ statusCode: 404, message: "User not exists" });
  }
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const generateEmailVerifyToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return {
    rawToken, // → send this in the email link
    hashedToken, // → store this in DB
    expiry: new Date(Date.now() + AUTH_CONSTANTS.EMAIL_VERIFY_TOKEN_TTL_MS), // 24h from now
  };
};

export { generateAccessAndRefreshToken, generateEmailVerifyToken };
