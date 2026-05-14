import config from "../config/config";
import User from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";
import jwt, {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError,
} from "jsonwebtoken";

export interface DecodedJWTPayload extends JwtPayload {
  _id: string;
  iat: number;
  exp: number;
}

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(
    token,
    config.ACCESS_TOKEN_SECRET,
  ) as DecodedJWTPayload;

  const user = await User.findById(decoded._id).select(
    "-password -refreshToken -emailVerifyToken -passwordResetToken -emailVerifyExpiry -passwordResetExpiry -verificationResendCount -verificationResendAt -deletedAt +avatarPublicId",
  );

  if (!user) {
    throw new ApiError({ statusCode: 401, message: "Unauthorized" });
  }

  req.user = user;
  next();
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // ✅ SET THE HEADER FIRST — before throwing
    // This runs on the res object directly, so it reaches the client
    // even though the error is thrown afterward
    res.setHeader("X-Token-Expired", "true");

    throw new ApiError({
      statusCode: 401,
      code: "TOKEN_EXPIRED",
      message: "Access token expired, request a new one with refresh token",
    });
  }

  if (error instanceof JsonWebTokenError) {
    throw new ApiError({ statusCode: 401, message: "Invalid access token" });
  }

  next(error);
}
});


export {
  verifyJWT,
}
