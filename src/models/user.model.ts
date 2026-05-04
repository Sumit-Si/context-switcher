import mongoose, { Schema } from "mongoose";
import config from "../config/config";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { AuthProviderEnum, AvailableAuthProviders } from "../constants";

export type PreferenceProps = {
  theme: "light" | "dark";
  workStartHour: number;
  workEndHour: number;
  notifications: boolean;
  defaultRitual: string;
};

export type AuthProviderProps = "local" | "google";

export type UserSchemaProps = {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  avatarPublicId?: string;
  refreshToken?: string;
  isEmailVerified: boolean;
  emailVerifyToken?: string;
  emailVerifyExpiry?: Date | null;
  passwordResetToken?: string;
  passwordResetExpiry?: Date | null;
  verificationResendCount: number;
  verificationResendAt: Date | null;
  googleId?: string;
  authProvider: AuthProviderProps;
  preferences: PreferenceProps;
  deletedAt?: Date | null;
  generateAccessToken: () => string;
  generateRefreshToken: () => string;
  isPasswordCorrect: (password: string) => Promise<boolean>;
};

const userSchema = new Schema<UserSchemaProps>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function (this: UserSchemaProps) {
        return this.authProvider === "local";
      },
      trim: true,
      min: [8, "Password must be at least 8 characters long"],
      max: [20, "Password must be at most 20 characters long"],
    },
    avatar: {
      type: String,
    },
    avatarPublicId: {
      type: String,
      select:false,
    },
    refreshToken: {
      type: String,
      select: false,  /// ← never returned unless explicitly requested
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: {
      type: String,
      select: false,
    },
    emailVerifyExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    verificationResendCount: {
      type: Number,
      default: 0,
      select: false,
    },
    verificationResendAt: {
      type: Date,
      default: null,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: AvailableAuthProviders,
      default: AuthProviderEnum.LOCAL,
    },
    preferences: {
      theme: { type: String, default: "light" },
      workStartHour: { type: Number, default: 9 },
      workEndHour: { type: Number, default: 18 },
      notifications: { type: Boolean, default: true },
      defaultRitual: { type: String, default: "brain-dump" },
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Hooks
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {

  const secret: Secret = config.ACCESS_TOKEN_SECRET;
  const expiresIn = config.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"];

  return jwt.sign({ _id: this._id.toString() }, secret, { expiresIn });
};

userSchema.methods.generateRefreshToken = function () {
  const secret: Secret = config.REFRESH_TOKEN_SECRET;
  const expiresIn = config.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"];

  return jwt.sign({ _id: this._id.toString() }, secret, { expiresIn });
};

const User = mongoose.model<UserSchemaProps>("User", userSchema);

export default User;
