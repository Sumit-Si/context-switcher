import { Types } from "mongoose";
import { ApiError } from "./ApiError";
import User from "../models/user.model";
import crypto from "crypto";

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

  // console.log(accessToken, refreshToken, "access and refresh");

  return { accessToken, refreshToken };
  // return { accessToken, refreshToken };
  // logger.error("Failed generating tokens", { error });
  // throw new ApiError({ statusCode: 500, message: "Problem while generating refresh and access tokens" });
};

const generateEmailVerifyToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return {
    rawToken,       // → send this in the email link
    hashedToken,    // → store this in DB
    expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),  // 24h from now
  };
};

export { generateAccessAndRefreshToken, generateEmailVerifyToken };
