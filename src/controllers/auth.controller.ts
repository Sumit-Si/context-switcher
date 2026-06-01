import type {
  CookieOptions,
  CreateUserRequestBodyProps,
  LoginUserRequestBodyProps,
  UpdateProfileRequestBodyProps,
} from "../types/auth.types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import config from "../config/config";
import type { UserDocument } from "../types/common.types";
import logger from "../config/logger";
import { AuthService } from "../services/auth.service";
import { generateAccessAndRefreshToken } from "../utils/tokenUtils";

const authService = new AuthService();

const getCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
});

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body as CreateUserRequestBodyProps;
  const registeredUser = await authService.register({
    username,
    email,
    password,
  });

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

  const user = await authService.verifyEmail(token);

  logger.info("Email verified successfully", {
    meta: {
      userId: user._id.toString(),
      email: user.email,
      requestId: req.headers["x-request-id"],
    },
  });

  return res.status(200).json(
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
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };

  await authService.resendVerificationEmail(email);

  logger.info("Verification email requested", {
    meta: {
      email,
      requestId: req.headers["x-request-id"],
    },
  });

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "If that email exists, a verification link was sent.",
      data: null,
    }),
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const requestId = req.headers["x-request-id"] as string;

  const { email, password } = req.body as LoginUserRequestBodyProps;

  try {
    const { user, accessToken, refreshToken } = await authService.login({
      email,
      password,
    });

    logger.info("User logged in successfully", {
      meta: {
        userId: user._id.toString(),
        requestId,
      },
    });

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...getCookieOptions(),
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse({
          statusCode: 200,
          data: {
            loggedInUser: user,
          },
          message: "User logged in successfully",
        }),
      );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn("Login failed", {
        meta: {
          email,
          ip,
          userAgent,
          requestId,
          security: true,
        },
      });
    }
    throw error;
  }
});

const profile = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: user,
      message: "User details fetched successfully",
    }),
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;
  const avatarLocalFile = req.file as Express.Multer.File;

  const updatedUser = await authService.updateProfile(
    user._id.toString(),
    req.body as UpdateProfileRequestBodyProps,
    avatarLocalFile?.path,
  );

  logger.info("Profile updated", {
    meta: {
      userId: user._id.toString(),
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: updatedUser,
      message: "Profile updated successfully",
    }),
  );
});

const logout = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  await authService.logout(user._id.toString());

  res.clearCookie("accessToken", getCookieOptions());
  res.clearCookie("refreshToken", getCookieOptions());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "User logged out successfully",
      data: null,
    }),
  );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken as string;
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const requestId = req.headers["x-request-id"] as string;

  if (!token) {
    throw new ApiError({
      statusCode: 401,
      message: "Token not exists",
    });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshTokens(token);

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...getCookieOptions(),
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", newRefreshToken, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse({
          statusCode: 200,
          message: "Access token refreshed successfully",
          data: null,
        }),
      );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn("Token mismatch or expiry", {
        meta: {
          ip,
          requestId,
        },
      });
    }
    throw error;
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };

  await authService.forgotPassword(email);

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "If that email exists, a reset link was sent.",
      data: null,
    }),
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params as { token: string };
  const { password: newPassword } = req.body as { password: string };

  await authService.resetPassword(token, newPassword);

  res.clearCookie("accessToken", getCookieOptions());
  res.clearCookie("refreshToken", getCookieOptions());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Password reset successfully",
      data: null,
    }),
  );
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  const user = req.user as UserDocument;

  await authService.changePassword(
    user._id.toString(),
    currentPassword,
    newPassword,
  );

  logger.info("Password changed — all sessions invalidated", {
    meta: {
      userId: user._id.toString(),
      requestId: req.headers["x-request-id"],
    },
  });

  res
    .status(200)
    .clearCookie("accessToken", getCookieOptions())
    .clearCookie("refreshToken", getCookieOptions())
    .json(
      new ApiResponse({
        statusCode: 200,
        message: "Password changed successfully",
        data: null,
      }),
    );
});

// OAuth
const loginWithGoogle = asyncHandler(async (req, res) => {
  try {
    const user = req.user as UserDocument;

    if (!user) {
      logger.warn("Google OAuth: no user on req after passport", {
        meta: {
          ip: req.ip,
          requestId: req.headers["x-request-id"],
        },
      });
      return res.redirect(`${config.CLIENT_URL}/login?error=oauth_failed`);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id,
    );

    logger.info("Google OAuth login", {
      meta: {
        userId: user._id.toString(),
        requestId: req.headers["x-request-id"],
      },
    });

    res.cookie("accessToken", accessToken, {
      ...getCookieOptions(),
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      ...getCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${config.CLIENT_URL}/panel/dashboard`);
  } catch (error) {
    logger.error("OAUTH_ERROR", {
      meta: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
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
  changePassword,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
};
