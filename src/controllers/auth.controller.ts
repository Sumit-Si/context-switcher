import User from "../models/user.model";
import {
  CookieOptions,
  CreateUserRequestBodyProps,
  LoginUserRequestBodyProps,
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
import { generateAccessAndRefreshToken } from "../utils/tokenUtils";
import jwt from "jsonwebtoken";
import { DecodedJWTPayload } from "../middlewares/auth.middleware";
import { UserDocument } from "../types/common.types";
import logger from "../config/logger";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body as CreateUserRequestBodyProps;
  // console.log(req.body);
  const existingUser = await User.findOne({
    email,
  }).select("email username");

  if (existingUser) {
    throw new ApiError({
      statusCode: 400,
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

  const rawVerifyToken = crypto.randomBytes(32).toString("hex");
  const hashedVerifyToken = crypto.createHash("sha256").update(rawVerifyToken).digest("hex");
  console.log("verifyToken", rawVerifyToken);

  user.emailVerifyToken = hashedVerifyToken;
  user.emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  // send mail
  await sendVerificationEmail(user, rawVerifyToken);

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

  const hashedVerifyToken = crypto.createHash("sha256").update(token).digest("hex");

  console.log("Hashed Token: ",hashedVerifyToken);

  const user = await User.findOne({
    emailVerifyToken: hashedVerifyToken,
    emailVerifyExpiry: { $gt: Date.now() }, // not expired
  }).select("-password -emailVerifyToken -emailVerifyExpiry");

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
      userId: user._id.toString(),
      email: user.email,
      // requestId: req.headers["x-request-id"],
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
    "_id username email isEmailVerified createdAt",
  );

  res.status(200)
    .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(
      new ApiResponse({
        statusCode: 200,
        data: {
          accessToken,
          refreshToken,
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
      throw new ApiError({
        statusCode: 200,
        message: "If that email exists, a reset link was sent.",
      });
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

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    console.log("access and refresh token", accessToken, refreshToken);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
    }

    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.redirect(`${config.CLIENT_URL}/panel/dashboard`);

  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${config.CLIENT_URL}/login?error=oauth_failed`);
  }
});

export {
  registerUser,
  verifyEmail,
  loginUser,
  profile,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
};
