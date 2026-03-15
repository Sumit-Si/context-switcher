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

  if (!user) {
    throw new ApiError({
      statusCode: 400,
      message: "Problem while creating user",
    });
  }

  const verifyToken = crypto.randomBytes(32).toString("hex");
  console.log("verifyToken", verifyToken);

  user.emailVerifyToken = verifyToken;
  user.emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  // send mail
  await sendVerificationEmail(user, verifyToken);

  res.status(201).json(
    new ApiResponse({
      statusCode: 201,
      data: user,
      message: "User created successfully",
    }),
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query as { token: string };

  if (!token) {
    throw new ApiError({
      statusCode: 400,
      message: "Token not exists",
    });
  }

  try {
    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpiry: { $gt: Date.now() }, // not expired
    }).select("-password");

    if (!user) {
      throw new ApiError({
        statusCode: 400,
        message: "Invalid or expired token",
      });
    }

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpiry = undefined;

    await user.save();

    res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
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

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginUserRequestBodyProps;

  const user = await User.findOne({
    email,
  }).select("email isEmailVerified _id");

  if (!user) {
    throw new ApiError({
      statusCode: 401,
      message: "Invalid email or password",
    });
  }

  const isMatch = await user.isPasswordCorrect(password);

  if (!isMatch) {
    throw new ApiError({
      statusCode: 401,
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
    "_id username email isEmailVerified",
  );

  res.status(200).json(
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
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
  };

  res.cookie("accessToken", "");
  res.cookie("refreshToken", "");

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "User logged out successfully",
      data: null,
    }),
  );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token: string = req.cookies.refreshToken;

  if (!token) {
    throw new ApiError({
      statusCode: 401,
      message: "Token not exists",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      config.REFRESH_TOKEN_SECRET,
    ) as DecodedJWTPayload;

    const user = await User.findById(decoded._id).select("refreshToken _id");

    if (!user || user.refreshToken !== token) {
      throw new ApiError({
        statusCode: 401,
        message: "Refresh token is invalid or expired",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
    };

    res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        message: "Access token refreshed successfully",
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      }),
    );
  } catch (error) {
    throw new ApiError({
      statusCode: 500,
      message: "Problem while refreshing access token",
    });
  }
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

    const token = crypto.randomBytes(32).toString("hex");
    console.log("Token", token);
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetToken = token;
    user.passwordResetExpiry = tokenExpiry;
    await user.save();

    await sendPasswordResetEmail(user, token);

    res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        message: "Password reset mail",
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
    const user = await User.findOne({
      passwordResetToken: token,
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

export {
  registerUser,
  verifyEmail,
  loginUser,
  profile,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
};
