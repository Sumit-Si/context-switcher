import User from "../models/user.model";
import { CreateUserRequestBodyProps } from "../types/auth.types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";
import crypto from "crypto";
import { sendVerificationEmail } from "../utils/emailUtils";
import { ApiResponse } from "../utils/ApiResponse";

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

const loginUser = asyncHandler(async (req, res) => {});

export { registerUser, loginUser };
