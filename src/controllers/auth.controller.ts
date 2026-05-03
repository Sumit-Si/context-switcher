import User from "../models/user.model";
import {
  CookieOptions,
  CreateUserRequestBodyProps,
  LoginUserRequestBodyProps,
  UpdateProfileRequestBodyProps,
} from "../types/auth.types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/emailUtils";
import { ApiResponse } from "../utils/ApiResponse";
import config from "../config/config";
import { generateAccessAndRefreshToken, generateEmailVerifyToken } from "../utils/tokenUtils";
import jwt from "jsonwebtoken";
import { DecodedJWTPayload } from "../middlewares/auth.middleware";
import { UserDocument } from "../types/common.types";
import logger from "../config/logger";
import { deleteFromCloudinary, uploadOnCloudinary } from "../config/cloudinary";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body as CreateUserRequestBodyProps;
  // console.log(req.body);
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  }).select("email username");

  // 409 -> resource already exists
  if (existingUser) {
    throw new ApiError({
      statusCode: 409,
      message: "User already exists",
    });
  }

  const user = await User.create({
    username,
    email,
    password,
  });

  const registeredUser = await User.findById(user._id)
    .select("_id username email isEmailVerified");

  if (!registeredUser) {
    throw new ApiError({
      statusCode: 400,
      message: "Problem while creating user",
    });
  }

  const { rawToken, hashedToken, expiry } = generateEmailVerifyToken();
  console.log("verifyToken", rawToken);

  user.emailVerifyToken = hashedToken;
  user.emailVerifyExpiry = expiry;
  await user.save();

  // send mail
  await sendVerificationEmail(user, rawToken);

  res.status(201).json(
    new ApiResponse({
      statusCode: 201,
      data: registeredUser,
      message: "User created successfully",
    }),
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query as { token: string };

  if (!token) {
    throw new ApiError({
      statusCode: 400,
      message: "Verification token is required",
    });
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  console.log("Hashed Token: ", hashedToken);

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpiry: { $gt: Date.now() }, // not expired
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

  try {

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isEmailVerified: true },
        $unset: { emailVerifyToken: "", emailVerifyExpiry: "" },
      }
    );

    logger.info("Email verified successfully", {
      meta: {
        userId: user._id.toString(),
        email: user.email,
        requestId: req.headers["x-request-id"],
      }

    });

    res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isEmailVerified: true,
        },
        message: "Email verified successfully",
      }),
    );
  } catch (error) {
    throw new ApiError({
      statusCode: 500,
      message: "Problem while verifying email",
    });
  }
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };

  const user = await User.findOne({
    email,
  }).select("email username +emailVerifyToken +emailVerifyExpiry +verificationResendCount +verificationResendAt");

  if (!user) {
    return res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        message: "If that email exists, a verification link was sent.",
        data: null,
      })
    );
  }

  if (user.isEmailVerified) {
    throw new ApiError({
      statusCode: 400,
      message: "This email is already verified. Please login.",
    });
  }

  // ✅ RATE LIMIT CHECK 1: 60 second cooldown per user
  const COOLDOWN_MS = 60 * 1000;
  if (
    user.verificationResendAt &&
    Date.now() - user.verificationResendAt.getTime() < COOLDOWN_MS
  ) {
    const secondsLeft = Math.ceil(
      (COOLDOWN_MS - (Date.now() - user.verificationResendAt.getTime())) / 1000
    );
    throw new ApiError({
      statusCode: 429,
      message: `Please wait ${secondsLeft} seconds before requesting another email.`,
    });
  }

  // ✅ RATE LIMIT CHECK 2: Max 5 resends total (abuse prevention)
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
        emailVerifyExpiry: expiry, // 24 hours
        verificationResendCount: user.verificationResendCount + 1,
        verificationResendAt: new Date(),
      },
    }
  );

  await sendVerificationEmail(user, rawToken);

  logger.info("Verification email resent", {
    meta: {
      userId: user._id.toString(),
      email: user.email,
      resendCount: user.verificationResendCount + 1,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Verification email resent",
      data: null,
    })
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginUserRequestBodyProps;

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

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
  };

  const loggedInUser = await User.findById(user._id).select(
    "_id username email avatar isEmailVerified createdAt",
  );

  res.status(200)
    .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(
      new ApiResponse({
        statusCode: 200,
        data: {
          // accessToken,
          // refreshToken,
          loggedInUser,
        },
        message: "User logged in successfully",
      }),
    );
});

const profile = asyncHandler(async (req, res) => {
  const user = req.user;
  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: user,
      message: "User details fetched successfully",
    }),
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const { username, email } = req.body as UpdateProfileRequestBodyProps;
  const user = req.user as UserDocument;

  const avatarLocalFile = req.file as Express.Multer.File;

  if (username !== user.username) {
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

  if (email !== user.email) {
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

  // ── Avatar upload ─────────────────────────────────────────────────────────
  if (avatarLocalFile) {
    // Delete old avatar from Cloudinary to avoid orphaned files
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
      // Non-fatal — log inside deleteFromCloudinary, continue with upload
    }

    const uploaded = await uploadOnCloudinary(
      avatarLocalFile.path,
      "context-switcher/avatars"
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

  const updatedUser = await User.findByIdAndUpdate(user._id,
    updateData,
    {
      new: true, select: "_id username email avatar isEmailVerified createdAt"
    }
  );

  logger.info("Profile updated", {
    userId: user._id.toString(),
    requestId: req.headers["x-request-id"],
    fields: Object.keys(updateData), // log WHAT changed, not the values
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: updatedUser,
      message: "Profile updated successfully",
    })
  );
});

const logout = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
  };

  await User.findByIdAndUpdate(user._id, {
    refreshToken: "",
  });

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "User logged out successfully",
      data: null,
    }),
  );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token: string = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError({
      statusCode: 401,
      message: "Token not exists",
    });
  }

  // FIX: No try/catch wrapper — asyncHandler already catches errors.
  // The old try/catch was converting every error (including valid 401s)
  // into a 500. jwt.verify() throws JsonWebTokenError or TokenExpiredError
  // — those should stay as 401s, not become 500s.

  let decoded: DecodedJWTPayload;

  try {
    decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET) as DecodedJWTPayload;
  } catch (jwtError) {
    // JWT errors are always auth failures — never 500
    // TokenExpiredError, JsonWebTokenError, NotBeforeError
    throw new ApiError({
      statusCode: 401,
      message: "Token is invalid or expired",
    });
  }

  const user = await User.findById(decoded._id).select("+refreshToken");
  // FIX: select("+refreshToken") — if refreshToken has select:false in schema
  // (which it should in prod), you need the + prefix to include it

  if (!user) {
    throw new ApiError({
      statusCode: 401,
      message: "User not exists",
    });
  }

  // FIX: Use timing-safe comparison to prevent timing attacks
  // Regular !== comparison leaks timing information
  // An attacker can measure response time to guess token bytes
  const storedTokenBuffer = Buffer.from(user.refreshToken ?? "", "utf8");
  const incomingTokenBuffer = Buffer.from(token, "utf8");

  const isValidToken =
    storedTokenBuffer.length === incomingTokenBuffer.length &&
    crypto.timingSafeEqual(storedTokenBuffer, incomingTokenBuffer);

  if (!isValidToken) {
    // FIX: Token mismatch = possible token theft / reuse attack
    // Invalidate the stored refresh token immediately (token rotation defense)
    await User.updateOne({ _id: user._id }, { $unset: { refreshToken: "" } });

    logger.warn("Token mismatch — possible token reuse attack", {
      userId: user._id.toString(),
      ip: req.ip,
      requestId: req.headers["x-request-id"],
    });

    throw new ApiError({
      statusCode: 401,
      message: "Token is invalid or expired",
    });
  }

  // Generate new token pair
  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(user._id);

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
  };

  logger.info("Access token refreshed", {
    userId: user._id.toString(),
    requestId: req.headers["x-request-id"],
  });

  // FIX: Don't send tokens in the response body — they're already in cookies
  // Sending them in body means JS can read them → defeats httpOnly purpose
  res
    .status(200)
    .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie("refreshToken", newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(
      new ApiResponse({
        statusCode: 200,
        message: "Access token refreshed successfully",
        data: null, // ← tokens are in cookies, not body
      })
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };

  try {
    const user = await User.findOne({
      email,
    }).select("_id email");

    if (!user) {
      return res.status(200).json(
        new ApiResponse({
          statusCode: 200,
          message: "If that email exists, a reset link was sent.",
          data: null,
        })
      )
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    console.log("Token", hashedToken);
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = tokenExpiry;
    await user.save();

    await sendPasswordResetEmail(user, rawToken);

    res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        message: "Password reset mail sent successfully",
        data: null,
      }),
    );
  } catch (error) {
    throw new ApiError({
      statusCode: 500,
      message: "Problem while sending reset email",
    });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params as { token: string };
  const { password: newPassword } = req.body as { password: string };

  try {
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
    user.refreshToken = ""; // revoke sessions after reset
    await user.save();

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        message: "Password reset successfully",
        data: null,
      }),
    );
  } catch (error) {
    throw new ApiError({
      statusCode: 500,
      message: "Problem while resetting password",
    });
  }
});

// OAuth
const loginWithGoogle = asyncHandler(async (req, res) => {
  try {
    const user = req.user as UserDocument;

    if (!user) {
      // This shouldn't happen (passport handles it) but guard anyway
      logger.warn("Google OAuth: no user on req after passport", {
        meta: {
          ip: req.ip,
          requestId: req.headers["x-request-id"],
        }
      });
      return res.redirect(`${config.CLIENT_URL}/login?error=oauth_failed`);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    console.log("access and refresh token", accessToken, refreshToken);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
    }

    logger.info("Google OAuth login", {
      meta: {
        userId: user._id.toString(),
        requestId: req.headers["x-request-id"],
      }
    });

    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.redirect(`${config.CLIENT_URL}/panel/dashboard`);

  } catch (error) {
    // console.error('OAuth error:', error);
    res.redirect(`${config.CLIENT_URL}/login?error=oauth_failed`);
  }
});

export {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  profile,
  updateProfile,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
};
