import User from "../models/user.model";
import type { UserDocument } from "../types/common.types";
import { ApiError } from "../utils/ApiError";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/emailUtils";
import {
  generateAccessAndRefreshToken,
  generateEmailVerifyToken,
} from "../utils/tokenUtils";
import jwt from "jsonwebtoken";
import config from "../config/config";
import type { DecodedJWTPayload } from "../middlewares/auth.middleware";
import { deleteFromCloudinary, uploadOnCloudinary } from "../config/cloudinary";
import { isMongoUniqueViolation } from "../utils/usernameUtils";
import type {
  CreateUserRequestBodyProps,
  LoginUserRequestBodyProps,
  UpdateProfileRequestBodyProps,
} from "../types/auth.types";

export interface IAuthService {
  register(data: CreateUserRequestBodyProps): Promise<UserDocument>;
  verifyEmail(token: string): Promise<UserDocument>;
  resendVerificationEmail(email: string): Promise<void>;
  login(
    data: LoginUserRequestBodyProps,
  ): Promise<{ user: UserDocument; accessToken: string; refreshToken: string }>;
  updateProfile(
    userId: string,
    data: UpdateProfileRequestBodyProps,
    avatarLocalPath?: string,
  ): Promise<UserDocument>;
  logout(userId: string): Promise<void>;
  refreshTokens(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(
    userId: string,
    current: string,
    newPwd: string,
  ): Promise<void>;
}

export class AuthService implements IAuthService {
  async register(data: CreateUserRequestBodyProps): Promise<UserDocument> {
    const { username, email, password } = data;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    }).select("email username");

    if (existingUser) {
      throw new ApiError({
        statusCode: 409,
        message: "User already exists",
      });
    }

    let user;
    try {
      user = await User.create({
        username,
        email,
        password,
      });
    } catch (error: unknown) {
      if (isMongoUniqueViolation(error)) {
        const field = Object.keys(
          (error as { keyPattern?: Record<string, unknown> })?.keyPattern ?? {},
        )[0];
        throw new ApiError({
          statusCode: 409,
          message: field
            ? `An account with this ${field} already exists`
            : "User already exists!",
        });
      }
      throw new ApiError({
        statusCode: 500,
        message: "Problem while creating user",
      });
    }

    const registeredUser = await User.findById(user._id).select(
      "_id username email isEmailVerified",
    );

    if (!registeredUser) {
      throw new ApiError({
        statusCode: 500,
        message: "Problem while creating user",
      });
    }

    const { rawToken, hashedToken, expiry } = generateEmailVerifyToken();

    user.emailVerifyToken = hashedToken;
    user.emailVerifyExpiry = expiry;
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(user, rawToken);

    return registeredUser;
  }

  async verifyEmail(token: string): Promise<UserDocument> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpiry: { $gt: Date.now() },
    }).select("-password +emailVerifyToken +emailVerifyExpiry");

    if (!user) {
      throw new ApiError({
        statusCode: 400,
        message: "Verification link is invalid or has expired",
      });
    }

    if (user.isEmailVerified) {
      throw new ApiError({
        statusCode: 400,
        message: "This email is already verified. Please login.",
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isEmailVerified: true },
        $unset: { emailVerifyToken: "", emailVerifyExpiry: "" },
      },
    );

    user.isEmailVerified = true;
    return user;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await User.findOne({
      email,
    }).select(
      "email username +emailVerifyToken +emailVerifyExpiry +verificationResendCount +verificationResendAt",
    );

    if (!user) {
      return; // Silently resolve to not leak user existence
    }

    if (user.isEmailVerified) {
      throw new ApiError({
        statusCode: 400,
        message: "This email is already verified. Please login.",
      });
    }

    const COOLDOWN_MS = 60 * 1000;
    if (
      user.verificationResendAt &&
      Date.now() - user.verificationResendAt.getTime() < COOLDOWN_MS
    ) {
      const secondsLeft = Math.ceil(
        (COOLDOWN_MS - (Date.now() - user.verificationResendAt.getTime())) /
          1000,
      );
      throw new ApiError({
        statusCode: 429,
        message: `Please wait ${secondsLeft} seconds before requesting another email.`,
      });
    }

    const MAX_RESENDS = 5;
    if (user.verificationResendCount >= MAX_RESENDS) {
      throw new ApiError({
        statusCode: 429,
        message: "Maximum resend attempts reached. Please contact support.",
      });
    }

    const { rawToken, hashedToken, expiry } = generateEmailVerifyToken();

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerifyToken: hashedToken,
          emailVerifyExpiry: expiry,
          verificationResendCount: user.verificationResendCount + 1,
          verificationResendAt: new Date(),
        },
      },
    );

    await sendVerificationEmail(user, rawToken);
  }

  async login(data: LoginUserRequestBodyProps): Promise<{
    user: UserDocument;
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, password } = data;

    const user = await User.findOne({
      email,
    }).select("email password isEmailVerified _id");

    if (!user) {
      throw new ApiError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.isPasswordCorrect(password);

    if (!isMatch) {
      throw new ApiError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      throw new ApiError({
        statusCode: 403,
        message: "Please verify your email first",
      });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
      "_id username email avatar isEmailVerified createdAt",
    );

    return { user: loggedInUser!, accessToken, refreshToken };
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileRequestBodyProps,
    avatarLocalPath?: string,
  ): Promise<UserDocument> {
    const { username, email } = data;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError({ statusCode: 404, message: "User not found" });
    }

    if (username && username !== user.username) {
      const alreadyExists = await User.findOne({
        username,
      }).select("_id");

      if (alreadyExists) {
        throw new ApiError({
          statusCode: 409,
          message: "Username already exists",
        });
      }
    }

    if (email && email !== user.email) {
      const alreadyExists = await User.findOne({
        email,
      }).select("_id");

      if (alreadyExists) {
        throw new ApiError({
          statusCode: 409,
          message: "Email already exists",
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    if (avatarLocalPath) {
      if (user.avatarPublicId) {
        await deleteFromCloudinary(user.avatarPublicId);
      }

      const uploaded = await uploadOnCloudinary(
        avatarLocalPath,
        "context-switcher/avatars",
      );

      if (!uploaded?.url) {
        throw new ApiError({
          statusCode: 500,
          message: "Image upload failed. Please try again.",
        });
      }

      updateData.avatar = uploaded.url;
      updateData.avatarPublicId = uploaded.public_id;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      returnDocument: "after",
      select: "_id username email avatar isEmailVerified createdAt",
    });

    return updatedUser!;
  }

  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      refreshToken: "",
    });
  }

  async refreshTokens(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: DecodedJWTPayload;

    try {
      decoded = jwt.verify(
        token,
        config.REFRESH_TOKEN_SECRET,
      ) as DecodedJWTPayload;
    } catch (_jwtError) {
      throw new ApiError({
        statusCode: 401,
        message: "Token is invalid or expired",
      });
    }

    const user = await User.findById(decoded._id).select("+refreshToken");

    if (!user) {
      throw new ApiError({
        statusCode: 401,
        message: "User not exists",
      });
    }

    const storedTokenBuffer = Buffer.from(user.refreshToken ?? "", "utf8");
    const incomingTokenBuffer = Buffer.from(token, "utf8");

    const isValidToken =
      storedTokenBuffer.length === incomingTokenBuffer.length &&
      crypto.timingSafeEqual(storedTokenBuffer, incomingTokenBuffer);

    if (!isValidToken) {
      await User.updateOne({ _id: user._id }, { $unset: { refreshToken: "" } });
      throw new ApiError({
        statusCode: 401,
        message: "Token is invalid or expired",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({
      email,
    }).select("_id email");

    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = tokenExpiry;
    await user.save();

    await sendPasswordResetEmail(user, rawToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError({
        statusCode: 400,
        message: "Token invalid or expired",
      });
    }

    user.passwordResetToken = undefined;
    user.password = newPassword;
    user.passwordResetExpiry = undefined;
    user.refreshToken = "";
    await user.save();
  }

  async changePassword(
    userId: string,
    current: string,
    newPwd: string,
  ): Promise<void> {
    const userInfo = await User.findOne({
      _id: userId,
      deletedAt: null,
    }).select("_id password authProvider");

    if (!userInfo) {
      throw new ApiError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    if (userInfo.authProvider === "google") {
      throw new ApiError({
        statusCode: 400,
        message:
          "Google accounts cannot use password change. Use Google account settings.",
      });
    }

    const isCurrentPasswordMatch = await userInfo.isPasswordCorrect(current);

    if (!isCurrentPasswordMatch) {
      throw new ApiError({
        statusCode: 400,
        message: "Invalid current password",
      });
    }

    userInfo.password = newPwd;
    userInfo.refreshToken = "";
    await userInfo.save();
  }
}
